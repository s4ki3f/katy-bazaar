import "server-only";
import { readFile, writeFile, mkdir } from "node:fs/promises";
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
