"use client";

// ─────────────────────────────────────────────────────────────
//  COUNTER APP — AUTHENTICATION
//
//  READ THIS BEFORE DEPLOYING.
//
//  A Next.js static export has no server, so nothing here can be trusted
//  to keep anyone out on its own. A passcode compared in the browser is
//  shipped inside the JS bundle; a "logged in" flag in storage can be set
//  by anyone with devtools. Client code cannot protect data.
//
//  What this module IS: a real session flow against a server that does the
//  checking. signIn() posts credentials to NEXT_PUBLIC_ADMIN_AUTH_API —
//  this app ships one at /api/auth — and keeps the returned token for the
//  tab. The orders and inventory routes reject requests without it. The
//  security lives on the server.
//
//  Three deployments that are actually safe, in order of effort:
//
//   1. Host-level password. Cloudflare Access, Netlify password protection
//      or Vercel deployment protection in front of /admin. Zero code, and
//      it is the right answer for a single shop.
//   2. Separate private deployment. Build the counter app with
//      NEXT_PUBLIC_ENABLE_ADMIN=true onto a host with auth, and leave it
//      out of the public GitHub Pages build entirely (the default).
//   3. Real auth provider. Move off static export, add Auth.js/Clerk and
//      a server route, and point NEXT_PUBLIC_ADMIN_AUTH_API at it.
//
//  Publishing this page on GitHub Pages, with or without a login screen,
//  exposes customer names and phone numbers. Do not do it.
// ─────────────────────────────────────────────────────────────

const TOKEN_KEY = "katy-bazaar-counter-token";
const ROLE_KEY = "katy-bazaar-counter-role";
/** Shown in the header so a signed-in person can see WHICH account they are on. Cosmetic only:
 *  the server never reads it, and derives who placed an order from the signed token instead. */
const EMAIL_KEY = "katy-bazaar-counter-email";

export type Role = "admin" | "staff";

/**
 * DEVELOPMENT-ONLY sign-in.
 *
 * The account table is declared INSIDE the guarded branch in signIn(), not
 * at module scope. `process.env.NODE_ENV` is replaced with a literal at
 * build time, so in a production build the condition becomes
 * `"production" !== "production"` and the bundler drops the whole block —
 * credentials included. A module-level const would survive tree-shaking
 * and ship the strings, which is what happened on the first attempt.
 *
 * Never put a real account here regardless. Anything compared in the
 * browser is readable by whoever opens devtools.
 */
export const devSignInAvailable = () =>
  process.env.NODE_ENV !== "production" && !process.env.NEXT_PUBLIC_ADMIN_AUTH_API;

export function getRole(): Role | null {
  try {
    const r = sessionStorage.getItem(ROLE_KEY);
    return r === "admin" || r === "staff" ? r : null;
  } catch {
    return null;
  }
}

/** The signed-in account's email, for display. Null when signed out. */
/**
 * Session changed IN THIS TAB.
 *
 * The `storage` event deliberately does not fire in the tab that made the change, and
 * sessionStorage is per-tab anyway — so nothing would have told the header that a sign-in or
 * sign-out just happened, and the badge would keep showing the previous state until the next focus
 * or reload. Signing in then navigating to the counter is exactly that path.
 */
export const SESSION_EVENT = "katy-bazaar-session";

function announce(): void {
  try {
    window.dispatchEvent(new Event(SESSION_EVENT));
  } catch {
    /* non-browser (SSR, tests) — nobody is listening anyway */
  }
}

export function getEmail(): string | null {
  try {
    return sessionStorage.getItem(EMAIL_KEY);
  } catch {
    return null;
  }
}

export type SignInResult =
  | { ok: true }
  | { ok: false; message: string };

export function authConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_ADMIN_AUTH_API);
}

export function getToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function hasSession(): boolean {
  return getToken() !== null;
}

export function signOut(): void {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(ROLE_KEY);
    sessionStorage.removeItem(EMAIL_KEY);
    announce();
  } catch {
    /* ignore */
  }
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  const endpoint = process.env.NEXT_PUBLIC_ADMIN_AUTH_API;

  // Local development: named accounts so the team can walk the flow.
  // Declared here so the whole block is dead code — and removed — in a
  // production build.
  if (process.env.NODE_ENV !== "production" && !endpoint) {
    const devAccounts: Record<string, { password: string; role: Role }> = {
      "admin@dev.com": { password: "admin", role: "admin" },
      "staff@dev.com": { password: "staff", role: "staff" },
    };
    const account = devAccounts[email.trim().toLowerCase()];
    if (!account || account.password !== password) {
      return { ok: false, message: "That email and password did not match." };
    }
    try {
      sessionStorage.setItem(TOKEN_KEY, `dev.${account.role}`);
      sessionStorage.setItem(ROLE_KEY, account.role);
      sessionStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
    } catch {
      return { ok: false, message: "Could not start a session — browser storage is unavailable." };
    }
    announce();
    return { ok: true };
  }

  // Refuse rather than pretend. No endpoint means no way to verify anyone,
  // and letting them through would be the dangerous failure mode.
  if (!endpoint) {
    return {
      ok: false,
      message:
        "Sign-in is not configured. NEXT_PUBLIC_ADMIN_AUTH_API must point at a server that verifies credentials — the browser cannot do it. See src/lib/admin/auth.ts.",
    };
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, message: "That email and password did not match." };
    }
    if (!res.ok) {
      return { ok: false, message: `Sign-in service returned ${res.status}.` };
    }
    const data = (await res.json()) as { token?: string; role?: Role };
    if (!data.token) {
      return { ok: false, message: "Sign-in succeeded but no session token was returned." };
    }
    try {
      sessionStorage.setItem(TOKEN_KEY, data.token);
      if (data.role === "admin" || data.role === "staff") sessionStorage.setItem(ROLE_KEY, data.role);
      sessionStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
    } catch {
      return { ok: false, message: "Could not start a session — browser storage is unavailable." };
    }
    announce();
    return { ok: true };
  } catch {
    return { ok: false, message: "Could not reach the sign-in service." };
  }
}

/** Authorization header for the orders API, when a session exists. */
export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}
