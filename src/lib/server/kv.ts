import "server-only";
import { readFile, writeFile, mkdir, rename, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";

/**
 * Small server-side key/value store.
 *
 * Two backends, chosen by environment:
 *
 *   • Upstash Redis over REST — set UPSTASH_REDIS_REST_URL and
 *     UPSTASH_REDIS_REST_TOKEN. This is what Vercel provisions for the
 *     Marketplace Redis integration, and it is the production path.
 *   • A JSON file under .data/ — used automatically in development so the
 *     app is fully working locally with nothing to provision.
 *
 * In production with no Upstash configured, reads return null and writes
 * throw. Callers surface that as a 503 rather than pretending an order or
 * an inventory edit was saved. Serverless filesystems are ephemeral, so
 * silently falling back to a file here would lose data on the next cold
 * start — exactly the failure this codebase refuses to ship.
 */

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

export const kvConfigured = Boolean(url && token);
export const kvIsFileBacked = !kvConfigured && process.env.NODE_ENV !== "production";
export const kvAvailable = kvConfigured || kvIsFileBacked;

export class KvUnavailableError extends Error {
  constructor() {
    super(
      "No datastore is configured. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN " +
        "(Vercel → Storage → Redis) so orders and inventory persist.",
    );
    this.name = "KvUnavailableError";
  }
}

const filePath = (key: string) => join(process.cwd(), ".data", `${key}.json`);

async function upstash<T>(command: unknown[]): Promise<T | null> {
  const res = await fetch(url!, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Redis returned ${res.status}`);
  const data = (await res.json()) as { result?: unknown };
  return (data.result ?? null) as T | null;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  if (kvConfigured) {
    const raw = await upstash<string>(["GET", key]);
    return raw ? (JSON.parse(raw) as T) : null;
  }
  if (!kvIsFileBacked) return null;
  try {
    return JSON.parse(await readFile(filePath(key), "utf8")) as T;
  } catch {
    return null;
  }
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  if (kvConfigured) {
    await upstash(["SET", key, JSON.stringify(value)]);
    return;
  }
  if (!kvIsFileBacked) throw new KvUnavailableError();
  const p = filePath(key);
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, JSON.stringify(value, null, 2), "utf8");
}

// ─────────────────────────────────────────────────────────────
//  ATOMIC PRIMITIVES
//
//  Everything above operates on a whole key. That is safe for a single writer and unsafe for two:
//  `kvGet` the orders array, prepend, `kvSet` it back is a read-modify-write, and two customers
//  checking out in the same instant both read N orders and both write N+1 — so one paid order is
//  gone with no error anywhere. The same interleaving loses a staff status update that lands while
//  an order is being placed.
//
//  The fix is not a bigger lock around the array; it is to stop keeping every order in one key.
//  Orders are stored one-per-key with a separate index list, so an intake writes only keys nobody
//  else is writing. These three primitives are what that requires.
// ─────────────────────────────────────────────────────────────

/**
 * File-backend serialisation.
 *
 * The file path exists only for local development, where there is exactly ONE Node process, so
 * chaining every mutation onto a single promise makes them observably atomic. It is NOT safe across
 * processes and is not meant to be: production is Redis, and in production with no Redis configured
 * `kvSet` already throws rather than pretend. Documented so nobody mistakes this for a distributed
 * lock.
 */
let fileQueue: Promise<unknown> = Promise.resolve();
function serialised<T>(fn: () => Promise<T>): Promise<T> {
  const run = fileQueue.then(fn, fn);
  fileQueue = run.catch(() => {});
  return run;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(filePath(key), "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Write via a temp file + rename, so a crash mid-write cannot leave a truncated JSON file. */
async function writeJsonAtomic(key: string, value: unknown): Promise<void> {
  const p = filePath(key);
  await mkdir(dirname(p), { recursive: true });
  const tmp = `${p}.tmp.${process.pid}.${tmpCounter++}`;
  await writeFile(tmp, JSON.stringify(value, null, 2), "utf8");
  await rename(tmp, p);
}
let tmpCounter = 0;

/**
 * Claim a key only if nobody holds it. Returns true if THIS caller created it.
 *
 * `SET key value NX` decides the winner inside Redis, which is what makes it usable to reserve an
 * order reference: checking "is this reference taken?" and then writing it are otherwise two steps
 * with a gap, and two simultaneous checkouts can both pass the check.
 */
export async function kvSetIfAbsent(key: string, value: unknown): Promise<boolean> {
  if (kvConfigured) {
    const res = await upstash<string | null>(["SET", key, JSON.stringify(value), "NX"]);
    return res === "OK";
  }
  if (!kvIsFileBacked) throw new KvUnavailableError();
  return serialised(async () => {
    const existing = await readJson<unknown>(key, null);
    if (existing !== null) return false;
    await writeJsonAtomic(key, value);
    return true;
  });
}

/**
 * Prepend to a capped list, atomically.
 *
 * LPUSH and LTRIM are two commands, and a REST pipeline batches without isolating, so they run as
 * one Lua script instead — Redis executes a script to completion before anything else runs. Without
 * that, a concurrent push between the two commands can be trimmed away by the wrong caller's cap.
 */
const PUSH_CAPPED = [
  "redis.call('LPUSH', KEYS[1], ARGV[1])",
  "local dropped = redis.call('LRANGE', KEYS[1], tonumber(ARGV[2]), -1)",
  "redis.call('LTRIM', KEYS[1], 0, tonumber(ARGV[2]) - 1)",
  "return dropped",
].join("; ");

/**
 * @returns the entries pushed off the end by the cap, so the caller can delete whatever they
 * pointed at. Without this the index stays bounded while the records it dropped live forever —
 * the cap would look like retention and actually be a leak.
 */
export async function kvListPushCapped(key: string, value: string, cap: number): Promise<string[]> {
  if (kvConfigured) {
    return (await upstash<string[]>(["EVAL", PUSH_CAPPED, "1", key, value, String(cap)])) ?? [];
  }
  if (!kvIsFileBacked) throw new KvUnavailableError();
  return serialised(async () => {
    const list = [value, ...(await readJson<string[]>(key, []))];
    await writeJsonAtomic(key, list.slice(0, cap));
    return list.slice(cap);
  });
}

/** The whole list, newest first. */
export async function kvListRange(key: string): Promise<string[]> {
  if (kvConfigured) return (await upstash<string[]>(["LRANGE", key, "0", "-1"])) ?? [];
  if (!kvIsFileBacked) return [];
  return readJson<string[]>(key, []);
}

/** Several keys at once, preserving order; a missing key yields null. */
export async function kvGetMany<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  if (kvConfigured) {
    const raw = (await upstash<(string | null)[]>(["MGET", ...keys])) ?? [];
    return raw.map((r) => (r ? (JSON.parse(r) as T) : null));
  }
  if (!kvIsFileBacked) return keys.map(() => null);
  return Promise.all(keys.map((k) => readJson<T | null>(k, null)));
}

/** Delete a key. Used to release a reserved reference when the order that claimed it fails. */
export async function kvDelete(key: string): Promise<void> {
  if (kvConfigured) {
    await upstash(["DEL", key]);
    return;
  }
  if (!kvIsFileBacked) return;
  await serialised(async () => {
    try {
      await unlink(filePath(key));
    } catch {
      /* already gone */
    }
  });
}
