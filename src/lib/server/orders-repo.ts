import "server-only";
import {
  kvGet,
  kvSet,
  kvSetIfAbsent,
  kvSetIfVersion,
  kvListPushCapped,
  kvListRange,
  kvGetMany,
  kvDelete,
} from "./kv";
import { makeReference, parseReference, mergeOrderUpdate } from "@/domain";
import { releaseForOrder } from "./availability";
import { randomInt } from "node:crypto";

/**
 * Order storage.
 *
 * WHY THIS EXISTS. Every order used to live inside ONE key holding one big array, and every write
 * was `kvGet` → mutate → `kvSet`. That is a lost update waiting to happen, and it had two live
 * forms: two customers checking out together both read N orders and both wrote N+1, so one paid
 * order disappeared with no error anywhere; and a staff status update rewrote the whole array, so
 * an order that arrived a moment earlier was erased by the save.
 *
 * Locking the array harder would only narrow the window. Instead the array is gone:
 *
 *   order:<n>       one order, one key. Concurrent intakes touch different keys, so they cannot
 *                   collide at all, and a status update rewrites only its own order.
 *   orders:index    a Redis LIST of references, newest first, capped. LPUSH is atomic, so the
 *                   index needs no read-modify-write either.
 *
 * The reference is reserved with SET NX, which means the reservation and the write are one step.
 * Checking "is this taken?" and then writing it is two steps with a gap, and that gap is exactly
 * where two simultaneous checkouts can both win.
 */

const INDEX_KEY = "orders:index";
const LEGACY_KEY = "orders";
/** Claimed BEFORE the work starts, to elect one migrator. Released on failure so a retry is possible. */
const MIGRATION_CLAIM_KEY = "orders:migrating-v2";
/** Written only AFTER the work finishes. This, not the claim, is what "migrated" means. */
const MIGRATION_DONE_KEY = "orders:migrated-v2";
export const MAX_STORED = 500;
/** 10^6 references against a 500-order book: P(20 straight collisions) is far below any real risk. */
const REFERENCE_ATTEMPTS = 20;

export type StoredOrder = { reference: string; status?: string; [k: string]: unknown };

/** Key for one order. References are `KB-115 366`; the digits alone make a clean, stable key. */
function orderKey(reference: string): string {
  const n = parseReference(reference);
  return n === null ? `order:raw:${encodeURIComponent(reference)}` : `order:${n}`;
}

/**
 * Move any pre-existing single-array data into per-order keys, once.
 *
 * TWO KEYS, NOT ONE, and the distinction is the whole point. An earlier version claimed a single
 * flag with SET NX *before* copying anything, so the flag meant "somebody started" and nothing ever
 * recorded that they finished. A throw part-way — an Upstash 5xx during N sequential round trips, a
 * function timeout — left the claim held, and every later attempt (including on the same instance)
 * saw it taken and skipped the work. The untouched tail of the legacy array became unreachable
 * with no error and no retry anywhere.
 *
 * So: CLAIM elects one migrator and is RELEASED if the work throws; DONE is written only after the
 * copy completes. And `listOrders` merges the legacy array whenever DONE is absent, so a partial or
 * in-flight migration can never make an order invisible — it can only make it appear twice, which
 * is deduplicated. Losing sight of a real order is unacceptable; briefly reading it from two places
 * is not.
 */
let migrationChecked = false;
async function ensureMigrated(): Promise<void> {
  if (migrationChecked) return;
  if (await kvGet<unknown>(MIGRATION_DONE_KEY)) {
    migrationChecked = true;
    return;
  }
  const legacy = await kvGet<StoredOrder[]>(LEGACY_KEY);
  if (!legacy || legacy.length === 0) {
    await kvSet(MIGRATION_DONE_KEY, { count: 0 });
    migrationChecked = true;
    return;
  }
  // Lost the election: another instance is mid-migration. Do NOT mark this checked — the legacy
  // merge in listOrders is what keeps those orders visible until DONE appears.
  if (!(await kvSetIfAbsent(MIGRATION_CLAIM_KEY, { count: legacy.length }))) return;

  try {
    const indexed = new Set(await kvListRange(INDEX_KEY));
    // Oldest first: each LPUSH goes to the head, so replaying in reverse restores newest-first.
    for (const order of [...legacy].reverse()) {
      if (typeof order?.reference !== "string") continue;
      await kvSetIfAbsent(orderKey(order.reference), order);
      // Skip anything already indexed, so a retry after a partial run cannot double-push.
      if (indexed.has(order.reference)) continue;
      const dropped = await kvListPushCapped(INDEX_KEY, order.reference, MAX_STORED);
      indexed.add(order.reference);
      // Records are never deleted here. A legacy import must not be able to evict a live order.
      void dropped;
    }
    await kvSet(MIGRATION_DONE_KEY, { count: legacy.length });
    migrationChecked = true;
  } catch (err) {
    // Release the claim so the next attempt can retry. Leaving it held is what made the failure
    // permanent before.
    await kvDelete(MIGRATION_CLAIM_KEY);
    throw err;
  }
}

/**
 * Mint a reference nobody else holds and store the order under it in the SAME operation.
 *
 * `build` is called per attempt because the order embeds its own reference. Returns null only if
 * every attempt collided, and the caller must then refuse the order — reusing a reference is how
 * the previous implementation lost them.
 */
export async function createOrder(
  build: (reference: string) => StoredOrder,
): Promise<{ reference: string; order: StoredOrder } | null> {
  await ensureMigrated();
  for (let i = 0; i < REFERENCE_ATTEMPTS; i++) {
    const reference = makeReference(randomInt(0, 1_000_000));
    const order = build(reference);
    if (await kvSetIfAbsent(orderKey(reference), order)) {
      // The index is capped for display; the RECORDS are deliberately kept. Deleting what the cap
      // evicts looked like tidy retention and was actually a remote-controlled purge: POST is
      // unauthenticated, so anyone could push 500 junk orders and permanently destroy every real
      // one. Eviction now costs visibility in the queue, never the order itself.
      await kvListPushCapped(INDEX_KEY, reference, MAX_STORED);
      return { reference, order };
    }
  }
  return null;
}

/**
 * The queue, newest first. A reference whose record is gone is skipped rather than returned null.
 *
 * While the migration is unfinished the legacy array is merged in and deduplicated by reference.
 * That is the safety net: a migration that died half-way, or one still running on another instance,
 * can never hide an order the shop actually took. Duplicates are removed; invisibility is not
 * something we can remove after the fact.
 */
export async function listOrders(): Promise<StoredOrder[]> {
  await ensureMigrated();
  const refs = await kvListRange(INDEX_KEY);
  const records = (await kvGetMany<StoredOrder>(refs.map(orderKey))).filter(
    (o): o is StoredOrder => o !== null,
  );

  if (migrationChecked) return records;

  const legacy = (await kvGet<StoredOrder[]>(LEGACY_KEY)) ?? [];
  if (legacy.length === 0) return records;
  const seen = new Set(records.map((o) => o.reference));
  return [...records, ...legacy.filter((o) => o?.reference && !seen.has(o.reference))];
}

export async function getOrder(reference: string): Promise<StoredOrder | null> {
  await ensureMigrated();
  return kvGet<StoredOrder>(orderKey(reference));
}

/**
 * Apply a staff edit to one order, refusing an edit based on a stale version.
 *
 * The version is checked twice, and both are load-bearing. `mergeOrderUpdate` compares what the
 * client claims against what we just read, which produces a good error; `kvSetIfVersion` compares
 * again inside a single Redis script at the moment of writing, which is what actually makes it
 * binding. Without the second, two tablets holding the same snapshot both pass the first check and
 * the later save silently reverts the earlier one — the weighed quantity a charge is computed from
 * simply disappearing.
 */
export async function updateOrder(
  reference: string,
  next: StoredOrder,
): Promise<
  | { ok: true; order: StoredOrder }
  | { ok: false; code: "no_such_order" }
  | { ok: false; code: "version_conflict"; errors: unknown[]; current: StoredOrder | null }
> {
  await ensureMigrated();
  const key = orderKey(reference);
  const existing = await kvGet<StoredOrder>(key);
  if (!existing) return { ok: false, code: "no_such_order" };

  const merged = mergeOrderUpdate(existing, { ...next, reference }, new Date().toISOString());
  if (!merged.ok) {
    if (merged.errors.some((e) => e.code === "no_such_order")) return { ok: false, code: "no_such_order" };
    return { ok: false, code: "version_conflict", errors: merged.errors, current: existing };
  }

  const expected = Number.isInteger(existing.version) ? (existing.version as number) : 0;
  const written = await kvSetIfVersion(key, merged.value, expected);
  if (!written.ok) {
    // Someone else saved between our read and our write. Hand back what is actually stored so the
    // counter app can show the truth rather than re-submitting over it.
    return {
      ok: false,
      code: "version_conflict",
      errors: [{ code: "version_conflict", expected: written.currentVersion, received: expected }],
      current: await kvGet<StoredOrder>(key),
    };
  }

  // Releasing on the way OUT of an open state, exactly once. A cancelled order must hand its stock
  // and slot back or they stay held by something nobody will collect; a collected one has physically
  // left the shop, so holding a reservation for it would shrink availability forever. This runs only
  // after the write succeeded, so a refused edit never releases anything.
  const CLOSED = new Set(["cancelled", "collected"]);
  const wasOpen = !CLOSED.has(String(existing.status ?? ""));
  const nowClosed = CLOSED.has(String(next.status ?? ""));
  if (wasOpen && nowClosed && Array.isArray(existing.reservation)) {
    await releaseForOrder(existing.reservation as { key: string; delta: number }[]);
  }

  return { ok: true, order: merged.value as StoredOrder };
}
