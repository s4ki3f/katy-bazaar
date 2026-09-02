import "server-only";
import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

export type Role = "admin" | "staff";

/** Constant-time compare, so a wrong value cannot be found by timing. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    timingSafeEqual(ab, ab); // burn a comparison so length is not leaked
    return false;
  }
  return timingSafeEqual(ab, bb);
}

export function issueToken(role: Role, secret: string): string {
  const payload = `${role}.${Date.now() + 12 * 60 * 60 * 1000}.${randomBytes(8).toString("hex")}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyToken(token: string, secret: string): Role | null {
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  let payload: string;
  try {
    payload = Buffer.from(body, "base64url").toString();
  } catch {
    return null;
  }
  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  if (!safeEqual(sig, expected)) return null;
  const [role, expires] = payload.split(".");
  if (Number(expires) < Date.now()) return null;
  return role === "admin" || role === "staff" ? role : null;
}

/** Role for a request's Bearer token, or null. Null means "do not serve". */
export function roleFromRequest(request: Request): Role | null {
  const secret = process.env.COUNTER_SESSION_SECRET;
  if (!secret) return null;
  const auth = request.headers.get("authorization") ?? "";
  const m = /^Bearer (.+)$/.exec(auth);
  return m ? verifyToken(m[1], secret) : null;
}
