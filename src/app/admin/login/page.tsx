"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn, authConfigured, devSignInAvailable } from "@/lib/admin/auth";
import { adminEnabled } from "@/lib/admin/store";
import { site } from "@/lib/site.config";

export default function CounterLoginPage() {
  // The public build ships no admin surface at all — offering a sign-in
  // form there would advertise the counter app and present something that
  // can never work.
  if (!adminEnabled()) return <LoginDisabled />;
  return <LoginForm />;
}

function LoginDisabled() {
  return (
    <div className="mx-auto max-w-lg px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-bold">Nothing to sign in to here</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The counter app is not part of this build. It is deployed separately, behind a login, on a
        host that can actually enforce one.
      </p>
      <Link href="/" className="mt-6 inline-block text-sm font-semibold text-primary hover:underline">
        ← Back to the storefront
      </Link>
    </div>
  );
}

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const configured = authConfigured() || devSignInAvailable();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    const result = await signIn(email, password);
    setBusy(false);
    if (result.ok) {
      router.replace("/admin");
      return;
    }
    setError(result.message);
  }

  const field =
    "w-full rounded-lg border border-field bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-6 py-12">
      <div className="rounded-card border border-border bg-surface p-8 shadow-soft">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {site.fullName}
        </p>
        <h1 className="mt-1 font-display text-2xl font-bold">Counter sign-in</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For staff. Customer orders are behind this.
        </p>

        {devSignInAvailable() && (
          <div className="mt-5 rounded-lg border border-border bg-muted p-4">
            <p className="font-display text-sm font-bold">Development sign-in</p>
            <p className="mt-1 text-xs text-muted-foreground">
              No auth server is running, so these local accounts are active. They exist only in a dev
              build — <code className="font-mono">next build</code> compiles them out.
            </p>
            <ul className="mt-2 space-y-0.5 font-mono text-xs">
              <li>admin@dev.com / admin</li>
              <li>staff@dev.com / staff</li>
            </ul>
          </div>
        )}

        {!configured && (
          <div className="mt-5 rounded-lg border-2 border-destructive bg-destructive/5 p-4">
            <p className="font-display text-sm font-bold text-destructive">Sign-in is not wired up</p>
            <p className="mt-1 text-xs text-foreground/80">
              Credentials can only be verified by a server, and a static export does not have one.
              Until <code className="font-mono">NEXT_PUBLIC_ADMIN_AUTH_API</code> points at one, this
              form cannot let anyone in — by design. See{" "}
              <code className="font-mono">src/lib/admin/auth.ts</code> for the three deployments that
              are actually safe.
            </p>
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground/80">Email</span>
            <input
              type="email" name="email" required autoComplete="username"
              value={email} onChange={(e) => setEmail(e.target.value)} className={field}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground/80">Password</span>
            <input
              type="password" name="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)} className={field}
            />
          </label>

          {error && (
            <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </p>
          )}

          <button
            type="submit" disabled={busy}
            className="w-full rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-dark disabled:opacity-60 cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>

      <Link href="/" className="mt-6 text-center text-sm font-semibold text-primary hover:underline">
        ← Back to the storefront
      </Link>
    </div>
  );
}
