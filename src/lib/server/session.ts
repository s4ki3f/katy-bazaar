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

/**
 * Resolve the caller's role and REQUIRE it to be one of `allowed`.
 *
 * WHY THIS EXISTS. `roleFromRequest` returns the role, and the role is trustworthy — it lives
 * inside the HMAC-signed payload, so a client cannot forge it. Every call site nevertheless wrote
 *
 *     if (!roleFromRequest(request)) return 401
 *
 * which throws the role away and asks only "is this anybody?". The counter UI has always drawn the
 * real line — `InventoryPanel` says "staff keep the shelves honest; only admin changes what a thing
 * is or costs" — but that line lived only in the browser, so a staff token could rewrite any price
 * with one curl. A truthiness test on a value that carries an authorisation decision is the bug.
 *
 * Returning a discriminated union rather than the role alone means a caller cannot accidentally use
 * the result as a boolean and get back to where we started.
 */
export type AuthOutcome =
  | { ok: true; role: Role }
  | { ok: false; response: Response };

export function requireRole(request: Request, allowed: readonly Role[]): AuthOutcome {
  const role = roleFromRequest(request);
  if (!role) {
    return {
      ok: false,
      response: Response.json({ error: "Not authorised." }, { status: 401 }),
    };
  }
  if (!allowed.includes(role)) {
    // 403, not 401: the caller IS authenticated and simply may not do this. Answering 401 would
    // tell a signed-in staff member their session had expired and send them to re-login forever.
    return {
      ok: false,
      response: Response.json(
        { error: "Your account does not have permission to do that.", errors: [{ code: "forbidden_role" }] },
        { status: 403 },
      ),
    };
  }
  return { ok: true, role };
}
