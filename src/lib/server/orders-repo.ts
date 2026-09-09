import "server-only";
import {
  listOrderRows,
  getOrderRow,
  insertOrderIfAbsent,
  updateOrderIfVersion,
  type StoredOrder,
} from "./db";
import { makeReference, mergeOrderUpdate } from "@/domain";
import { releaseForOrder } from "./availability";
import { randomInt } from "node:crypto";

/**
 * Order storage, on Postgres.
 *
 * WHY THIS SHAPE. Every order used to live inside ONE key holding one big array, and every write
 * was read-modify-write, so two customers checking out together both read N orders and both wrote
 * N+1 — one paid order vanished with no error anywhere. Measured against that shape, 25 concurrent
 * orders persisted 1.
 *
 * One row per order removes the class outright: concurrent intakes touch different rows, and a
 * staff edit updates only its own. The Redis version needed a separate `orders:index` list to get
 * newest-first ordering; Postgres orders the table itself, so that list — and every bug it could
 * carry — is simply gone.
 */

export const MAX_STORED = 500;
/** 10^6 references against a 500-order book: twenty straight collisions is not a real risk. */
const REFERENCE_ATTEMPTS = 20;

export type { StoredOrder };

/**
 * Mint a reference nobody holds and write the order under it in ONE statement.
 *
 * `insertOrderIfAbsent` is an `on conflict do nothing` insert, so the database decides the winner.
 * Checking whether a reference is taken and then inserting it would be two steps with a gap, and
 * that gap is where two simultaneous checkouts both win.
 */
export async function createOrder(
  build: (reference: string) => StoredOrder,
): Promise<{ reference: string; order: StoredOrder } | null> {
  for (let i = 0; i < REFERENCE_ATTEMPTS; i++) {
    const reference = makeReference(randomInt(0, 1_000_000));
    const order = build(reference);
    if (await insertOrderIfAbsent(reference, order)) return { reference, order };
  }
  return null;
}

/** The queue, newest first. */
export async function listOrders(): Promise<StoredOrder[]> {
  const rows = await listOrderRows(MAX_STORED);
  return rows.map((r) => ({ ...r.data, reference: r.reference, version: r.version }));
}

export async function getOrder(reference: string): Promise<StoredOrder | null> {
  const row = await getOrderRow(reference);
  return row ? { ...row.data, reference: row.reference, version: row.version } : null;
}

/**
 * Apply a staff edit, refusing one based on a stale version.
 *
 * Checked twice, and both matter. `mergeOrderUpdate` compares what the client claims against what
 * was just read, which produces a good error message; the UPDATE carries `version = $expected` in
 * its WHERE clause, which is what actually makes it binding. Without the second, two tablets on the
 * same snapshot both pass the first check and the later save silently reverts the earlier one.
 */
export async function updateOrder(
  reference: string,
  next: StoredOrder,
): Promise<
  | { ok: true; order: StoredOrder }
  | { ok: false; code: "no_such_order" }
  | { ok: false; code: "version_conflict"; errors: unknown[]; current: StoredOrder | null }
> {
  const row = await getOrderRow(reference);
  if (!row) return { ok: false, code: "no_such_order" };

  const existing: StoredOrder = { ...row.data, reference: row.reference, version: row.version };
  const merged = mergeOrderUpdate(existing, { ...next, reference }, new Date().toISOString());
  if (!merged.ok) {
    if (merged.errors.some((e) => e.code === "no_such_order")) return { ok: false, code: "no_such_order" };
    return { ok: false, code: "version_conflict", errors: merged.errors, current: existing };
  }

  const written = await updateOrderIfVersion(reference, row.version, merged.value as StoredOrder, row.version + 1);
  if (!written) {
    // Somebody saved between our read and our write. Hand back what is actually stored so the
    // counter app can show the truth rather than re-submitting over work it never saw.
    const current = await getOrder(reference);
    return {
      ok: false,
      code: "version_conflict",
      errors: [{ code: "version_conflict", expected: current?.version, received: row.version }],
      current,
    };
  }

  // Release only AFTER the write succeeds, and only on the way OUT of an open state — so a refused
  // edit releases nothing, and cancelling twice releases once.
  const CLOSED = new Set(["cancelled", "collected"]);
  const wasOpen = !CLOSED.has(String(existing.status ?? ""));
  const nowClosed = CLOSED.has(String(next.status ?? ""));
  if (wasOpen && nowClosed && Array.isArray(existing.reservation)) {
    await releaseForOrder(existing.reservation as { key: string; delta: number }[]);
  }

  return { ok: true, order: { ...written.data, reference: written.reference, version: written.version } };
}
