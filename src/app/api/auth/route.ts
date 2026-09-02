import { createHmac, timingSafeEqual, randomBytes } from "node:crypto";

/**
 * Counter sign-in — the server side the static export could never have.
 *
 * Point NEXT_PUBLIC_ADMIN_AUTH_API at /api/auth and the counter app's
 * existing login flow becomes real: credentials are checked here, never in
 * the browser, and the client only ever holds a signed token.
 *
 * Required environment variables (set them in the Vercel dashboard, not in
 * the repo — none are NEXT_PUBLIC_, so they never reach the bundle):
 *
 *   COUNTER_SESSION_SECRET   long random string; signs the session token
 *   COUNTER_ADMIN_EMAIL      admin account
 *   COUNTER_ADMIN_PASSWORD
 *   COUNTER_STAFF_EMAIL      staff account (optional)
 *   COUNTER_STAFF_PASSWORD
 *
 * With no secret configured the route refuses every request rather than
 * falling open — same rule as the rest of this codebase.
 */

export const runtime = "nodejs";

type Role = "admin" | "staff";

/** Constant-time compare, so a wrong password cannot be found by timing. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // still burn a comparison so length is not leaked by timing
    timingSafeEqual(ab, ab);
    return false;
  }
  return timingSafeEqual(ab, bb);
}

function issueToken(role: Role, secret: string): string {
  const payload = `${role}.${Date.now() + 12 * 60 * 60 * 1000}.${randomBytes(8).toString("hex")}`;
  const sig = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

/** Exported so the orders/inventory routes can authorise the same token. */
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

export async function POST(request: Request) {
  const secret = process.env.COUNTER_SESSION_SECRET;
  if (!secret) {
    return Response.json(
      { error: "Sign-in is not configured on the server: COUNTER_SESSION_SECRET is unset." },
      { status: 503 },
    );
  }

  let email = "";
  let password = "";
  try {
    const body = (await request.json()) as { email?: string; password?: string };
    email = (body.email ?? "").trim().toLowerCase();
    password = body.password ?? "";
  } catch {
    return Response.json({ error: "Malformed request." }, { status: 400 });
  }

  const accounts: { email?: string; password?: string; role: Role }[] = [
    { email: process.env.COUNTER_ADMIN_EMAIL?.toLowerCase(), password: process.env.COUNTER_ADMIN_PASSWORD, role: "admin" },
    { email: process.env.COUNTER_STAFF_EMAIL?.toLowerCase(), password: process.env.COUNTER_STAFF_PASSWORD, role: "staff" },
  ];

  for (const a of accounts) {
    if (!a.email || !a.password) continue;
    if (safeEqual(email, a.email) && safeEqual(password, a.password)) {
      return Response.json({ token: issueToken(a.role, secret), role: a.role });
    }
  }

  // One message for every failure — never reveal which half was wrong.
  return Response.json({ error: "That email and password did not match." }, { status: 401 });
}
