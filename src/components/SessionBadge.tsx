"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getEmail, getRole, getToken, signOut, SESSION_EVENT, type Role } from "@/lib/admin/auth";

/**
 * Who is signed in, shown on every page.
 *
 * The storefront and the counter share a browser, and nothing used to say which hat you were
 * wearing: a staff member on /shop saw exactly what a customer sees, added to a cart, and checked
 * out with no indication anywhere that they were signed in at all.
 *
 * This is DISPLAY ONLY. The role comes from sessionStorage, which the browser owns and a determined
 * person can edit, so it decides nothing — every route authorises against the signed token
 * server-side, and an order records who placed it from that token rather than from anything here.
 */

/**
 * `storage` does not fire in the tab that made the change, and sessionStorage is per-tab, so signing
 * in or out would leave this showing the previous state until the next focus or reload. `signIn` and
 * `signOut` dispatch SESSION_EVENT for exactly that case; focus covers a change made while the tab
 * was in the background.
 */
function subscribe(onChange: () => void) {
  window.addEventListener(SESSION_EVENT, onChange);
  window.addEventListener("storage", onChange);
  window.addEventListener("focus", onChange);
  return () => {
    window.removeEventListener(SESSION_EVENT, onChange);
    window.removeEventListener("storage", onChange);
    window.removeEventListener("focus", onChange);
  };
}

/**
 * Is the stored token still within its lifetime?
 *
 * A 12-hour token expires while the tab is open, and the role outlives it in sessionStorage — so a
 * badge would keep claiming a live session, and the banner would keep promising that an order gets
 * attributed to staff, while the server had already stopped accepting the token and was recording
 * those orders as a customer's. Reading the expiry is DISPLAY ONLY; the server verifies the
 * signature and this cannot grant anything.
 */
function tokenLooksLive(): boolean {
  const t = getToken();
  if (!t) return false;
  if (t.startsWith("dev.")) return true; // development sign-in carries no expiry
  try {
    const [body] = t.split(".");
    const [, expires] = atob(body.replace(/-/g, "+").replace(/_/g, "/")).split(".");
    return Number(expires) > Date.now();
  } catch {
    return false;
  }
}

export function useSession(): { role: Role | null; email: string | null } {
  const role = useSyncExternalStore(subscribe, () => (tokenLooksLive() ? getRole() : null), () => null);
  const email = useSyncExternalStore(subscribe, () => getEmail(), () => null);
  return { role, email: role ? email : null };
}

export function SessionBadge({ className = "" }: { className?: string }) {
  const { role, email } = useSession();
  if (!role) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-accent"
        title={email ?? undefined}
      >
        <span aria-hidden="true" className="inline-block h-1.5 w-1.5 rounded-full bg-accent" />
        {role}
      </span>
      {email && <span className="hidden text-xs text-muted-foreground lg:inline">{email}</span>}
      <Link href="/admin" className="text-xs font-semibold text-primary hover:underline">
        Counter
      </Link>
      <button
        type="button"
        /* No reload: signOut dispatches SESSION_EVENT and every subscriber re-reads, so the page
           does not have to be thrown away — which on the checkout confirmation would have taken the
           customer's just-issued pickup reference with it. */
        onClick={() => signOut()}
        className="cursor-pointer text-xs font-semibold text-muted-foreground hover:text-foreground hover:underline"
      >
        Sign out
      </button>
    </div>
  );
}

/**
 * The "you are looking at the customer view" bar.
 *
 * Rendered on storefront pages only. Staff taking a phone order is a real workflow, so this does not
 * block anything — it says plainly which view you are in, and that an order placed here will be
 * recorded as taken by staff rather than by the shopper.
 */
export function StaffViewBanner() {
  const { role } = useSession();
  const pathname = usePathname();
  // The counter IS the staff view. Telling someone standing in it that they are "in the customer
  // view" is just wrong, and this component lives in the root layout, which covers /admin too.
  if (!role || pathname?.startsWith("/admin")) return null;

  return (
    <div className="border-b border-accent/30 bg-accent/10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4 py-2 text-center text-xs text-foreground/80 sm:px-6">
        <span>
          Signed in as <strong className="font-semibold">{role}</strong> — this is the customer view.
          An order placed here is recorded as taken by staff.
        </span>
        <Link href="/admin" className="font-semibold text-primary hover:underline">
          Go to the counter →
        </Link>
      </div>
    </div>
  );
}
