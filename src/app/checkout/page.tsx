"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";
import { site } from "@/lib/site.config";
import { money } from "@/lib/format";
import { CheckIcon, ArrowIcon, PinIcon } from "@/components/icons";

type Payment = "cash" | "card";

export default function CheckoutPage() {
  const { lines, subtotal, clear, ready } = useCart();
  const [payment, setPayment] = useState<Payment>("cash");
  const [placed, setPlaced] = useState<string | null>(null);

  if (!ready) return <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">Loading…</div>;

  if (placed) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white">
          <CheckIcon width={34} height={34} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-bold">Order confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your order. Your pickup confirmation number is{" "}
          <span className="font-bold text-foreground">{placed}</span>.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll have your order bagged and ready for pickup at {site.address.line1}, {site.address.city}.
          A demo confirmation — no payment was processed.
        </p>
        <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary hover:bg-primary-dark">
          Continue shopping <ArrowIcon width={18} height={18} />
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <h1 className="font-display text-2xl font-bold">Your cart is empty</h1>
        <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary hover:bg-primary-dark">
          Go to shop <ArrowIcon width={18} height={18} />
        </Link>
      </div>
    );
  }

  const tax = subtotal * site.taxRate;
  const total = subtotal + tax;

  function placeOrder(e: React.FormEvent) {
    e.preventDefault();
    const num = "KB-" + Math.floor(100000 + Math.random() * 900000);
    clear();
    setPlaced(num);
    window.scrollTo({ top: 0 });
  }

  const inputCls =
    "w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm outline-none focus:border-primary focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Checkout</h1>
      <p className="mt-1 text-muted-foreground">In-store pickup — order ahead and we&apos;ll have it ready.</p>

      <form onSubmit={placeOrder} className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="space-y-8">
          {/* pickup location */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold">Pickup location</h2>
            <div className="mt-4 flex items-start gap-3 rounded-lg bg-muted p-4">
              <PinIcon width={22} height={22} className="mt-0.5 shrink-0 text-primary" />
              <div className="text-sm">
                <p className="font-display font-semibold text-foreground">{site.fullName}</p>
                <p className="text-muted-foreground">
                  {site.address.line1}, {site.address.line2}<br />
                  {site.address.city}, {site.address.state} {site.address.zip}
                </p>
                <p className="mt-1 font-medium text-primary">Usually ready within the hour</p>
              </div>
            </div>
            <div className="mt-4">
              <Field label="Preferred pickup time (optional)">
                <input type="text" placeholder="e.g. Today around 5:30 PM" className={inputCls} />
              </Field>
            </div>
          </section>

          {/* contact */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><input required autoComplete="name" className={inputCls} /></Field>
              <Field label="Phone"><input required type="tel" autoComplete="tel" className={inputCls} /></Field>
              <Field label="Email" className="sm:col-span-2"><input required type="email" autoComplete="email" className={inputCls} /></Field>
              <Field label="Order notes (optional)" className="sm:col-span-2"><textarea rows={2} className={inputCls} placeholder="Custom cuts, special requests, etc." /></Field>
            </div>
          </section>

          {/* payment */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold">Payment</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {(["cash", "card"] as Payment[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPayment(p)}
                  className={`rounded-lg border-2 p-4 text-left transition-colors cursor-pointer ${
                    payment === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="font-display font-semibold">{p === "cash" ? "Cash at Pickup" : "Card"}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{p === "cash" ? "Pay in-store when you collect" : "Demo only — no charge"}</span>
                </button>
              ))}
            </div>
            {payment === "card" && (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Card number" className="sm:col-span-2"><input className={inputCls} placeholder="4242 4242 4242 4242" inputMode="numeric" /></Field>
                <Field label="Expiry"><input className={inputCls} placeholder="MM/YY" /></Field>
                <Field label="CVC"><input className={inputCls} placeholder="123" inputMode="numeric" /></Field>
              </div>
            )}
          </section>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Your order</h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {lines.map(({ product, qty, lineTotal }) => (
                <li key={product.id} className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex-1">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground"> × {qty}</span>
                  </span>
                  <span className="font-semibold">{money(lineTotal)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Pickup</dt><dd className="font-semibold">Free</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Est. tax</dt><dd className="font-semibold">{money(tax)}</dd></div>
              <div className="flex justify-between border-t border-border pt-3 text-base"><dt className="font-display font-bold">Total</dt><dd className="font-display font-bold">{money(total)}</dd></div>
            </dl>
            <button type="submit" className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary transition-colors hover:bg-primary-dark cursor-pointer">
              Place pickup order · {money(total)}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">This is a demo store. No payment is processed.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-sm font-medium text-foreground/80">{label}</span>
      {children}
    </label>
  );
}
