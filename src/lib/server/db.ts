import "server-only";

/**
 * Supabase (Postgres) storage.
 *
 * This replaces a Redis-shaped key/value layer, and it is deliberately NOT a translation of it.
 * Most of that layer existed to emulate things Postgres does natively:
 *
 *   • the `orders:index` list is gone — it only existed because Redis cannot order a keyspace,
 *     and here it is `order by placed_at desc limit 500`
 *   • `SET NX` to reserve a reference becomes `insert ... on conflict do nothing`
 *   • the Lua reserve/release scripts become plpgsql functions, atomic for the same reason:
 *     the database runs them to completion before anything else sees an intermediate state
 *   • the Lua compare-and-set becomes `update ... where version = $expected`
 *
 * Reached over PostgREST with `fetch`, so this adds no dependency — the same choice the Upstash
 * layer made. The SERVICE ROLE key is used and must never reach the browser; it is read from a
 * non-NEXT_PUBLIC_ variable so it cannot be bundled by accident.
 */

const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dbConfigured = Boolean(url && key);
/** Kept for the routes' existing shape: they answer 503 when storage is absent. */
export const dbAvailable = dbConfigured;

export class DbUnavailableError extends Error {
  constructor() {
    super(
      "No datastore is configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY " +
        "(Supabase → Project Settings → API) so orders and inventory persist.",
    );
    this.name = "DbUnavailableError";
  }
}

function headers(extra: Record<string, string> = {}): Record<string, string> {
  return {
    apikey: key!,
    Authorization: `Bearer ${key!}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

async function rest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!dbConfigured) throw new DbUnavailableError();
  const res = await fetch(`${url}/rest/v1/${path}`, { ...init, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export type StoredOrder = { reference: string; version?: number; [k: string]: unknown };
type Row = { reference: string; version: number; data: StoredOrder };

/** Newest first, capped. No index list to maintain — Postgres orders the table itself. */
export async function listOrderRows(limit = 500): Promise<Row[]> {
  return rest<Row[]>(`orders?select=reference,version,data&order=placed_at.desc&limit=${limit}`, {
    headers: headers(),
  });
}

export async function getOrderRow(reference: string): Promise<Row | null> {
  const rows = await rest<Row[]>(
    `orders?select=reference,version,data&reference=eq.${encodeURIComponent(reference)}&limit=1`,
    { headers: headers() },
  );
  return rows?.[0] ?? null;
}

/**
 * Claim a reference and write the order in ONE statement.
 *
 * `resolution=ignore-duplicates` makes this `on conflict do nothing`, so two simultaneous
 * checkouts drawing the same reference cannot both succeed — the loser gets no row back and
 * redraws. Checking "is this taken?" and then inserting would be two steps with a gap.
 */
export async function insertOrderIfAbsent(reference: string, order: StoredOrder): Promise<boolean> {
  const rows = await rest<Row[]>("orders", {
    method: "POST",
    headers: headers({ Prefer: "return=representation,resolution=ignore-duplicates" }),
    body: JSON.stringify({ reference, version: 1, data: order }),
  });
  return Array.isArray(rows) && rows.length > 0;
}

/**
 * Compare-and-set on the version.
 *
 * The filter carries the expected version, so the row is only written if nobody has saved since
 * it was read. An empty result means somebody did, and the caller must rebase rather than retry.
 */
export async function updateOrderIfVersion(
  reference: string,
  expectedVersion: number,
  next: StoredOrder,
  nextVersion: number,
): Promise<Row | null> {
  const rows = await rest<Row[]>(
    `orders?reference=eq.${encodeURIComponent(reference)}&version=eq.${expectedVersion}`,
    {
      method: "PATCH",
      headers: headers({ Prefer: "return=representation" }),
      body: JSON.stringify({ data: next, version: nextVersion, updated_at: new Date().toISOString() }),
    },
  );
  return rows?.[0] ?? null;
}

export async function getInventory<T>(): Promise<T | null> {
  const rows = await rest<{ data: T }[]>("inventory?select=data&id=eq.current&limit=1", {
    headers: headers(),
  });
  return rows?.[0]?.data ?? null;
}

export async function setInventory(value: unknown): Promise<void> {
  await rest("inventory", {
    method: "POST",
    headers: headers({ Prefer: "resolution=merge-duplicates" }),
    body: JSON.stringify({ id: "current", data: value }),
  });
}

export type ReserveEntry = { key: string; delta: number; max: number };

/**
 * Apply every entry or none, by calling the `reserve_all` function.
 *
 * The ceiling check and the increment happen inside one transaction in the database. A check in
 * application code would be read-compare-write — three steps, and two shoppers can both pass the
 * comparison before either writes. That is the whole reason this lives in SQL.
 *
 * @returns `{ ok: true }`, or the key whose ceiling blocked it, having written nothing.
 */
export async function reserveAll(
  entries: ReserveEntry[],
): Promise<{ ok: true } | { ok: false; blockedKey: string }> {
  if (entries.length === 0) return { ok: true };
  const blocked = await rest<string | null>("rpc/reserve_all", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ entries }),
  });
  return blocked ? { ok: false, blockedKey: blocked } : { ok: true };
}

export async function releaseAll(entries: { key: string; delta: number }[]): Promise<void> {
  if (entries.length === 0) return;
  await rest("rpc/release_all", {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ entries }),
  });
}

/** Current counter values, for showing real remaining capacity. */
export async function counters(keys: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = Object.create(null);
  if (keys.length === 0) return out;
  const list = keys.map((k) => `"${k.replace(/"/g, '')}"`).join(",");
  const rows = await rest<{ key: string; value: number }[]>(
    `counters?select=key,value&key=in.(${encodeURIComponent(list)})`,
    { headers: headers() },
  );
  for (const k of keys) out[k] = 0;
  for (const r of rows ?? []) out[r.key] = Number(r.value) || 0;
  return out;
}
