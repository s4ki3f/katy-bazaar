"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { useCart } from "@/context/CartContext";
import { site, contactIsPlaceholder } from "@/lib/site.config";
import { money } from "@/lib/format";
import { computeTax } from "@/lib/tax";
import { isWeighed } from "@/lib/products";
import { getPickupSlots } from "@/lib/slots";
import { submitOrder, orderReference, type Order } from "@/lib/order";
import { CheckIcon, ArrowIcon, PinIcon } from "@/components/icons";

type Payment = "cash" | "card";

export default function CheckoutPage() {
  const { lines, subtotal, clear, ready } = useCart();
  const [payment, setPayment] = useState<Payment>("cash");
  const [placed, setPlaced] = useState<string | null>(null);
  const [slotId, setSlotId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // slots are time-dependent, so compute once per mount (never during render on the server)
  const slots = useMemo(() => getPickupSlots(), []);

  if (!ready) return <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">Loading…</div>;

  if (placed) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 420, damping: 18 }}
          className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white"
        >
          <CheckIcon width={34} height={34} />
        </motion.span>
        <h1 className="mt-5 font-display text-3xl font-bold">Order confirmed!</h1>
        <p className="mt-2 text-muted-foreground">
          Thank you for your order. Your pickup confirmation number is{" "}
          <span className="font-bold text-foreground">{placed}</span>.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll have your order bagged and ready for pickup in {site.address.city}. Pay at the
          counter when you collect — nothing has been charged.
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

  const { tax, allExempt } = computeTax(lines);
  const total = subtotal + tax;
  const anyWeighed = lines.some((l) => isWeighed(l.product));
  const chosenSlot = slots.find((s) => s.id === slotId);

  async function placeOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setSubmitError(null);

    const form = new FormData(e.currentTarget);
    const reference = orderReference();

    const order: Order = {
      reference,
      placedAt: new Date().toISOString(),
      customer: {
        name: String(form.get("name") ?? ""),
        phone: String(form.get("phone") ?? ""),
        email: String(form.get("email") ?? ""),
      },
      pickupSlot: chosenSlot ? `${chosenSlot.dayLabel}, ${chosenSlot.timeLabel}` : "No preference",
      notes: String(form.get("notes") ?? "") || undefined,
      paymentPreference: payment,
      lines: lines.map((l) => ({
        name: l.product.name,
        unit: l.product.unit,
        qty: l.qty,
        lineTotal: l.lineTotal,
        cut: l.cut,
        allowSubstitution: l.allowSub,
      })),
      subtotal,
      tax,
      total,
      hasWeighedItems: anyWeighed,
    };

    setSubmitting(true);
    const result = await submitOrder(order);
    setSubmitting(false);

    if (!result.ok) {
      setSubmitError(result.message);
      return;
    }

    clear();
    setPlaced(reference);
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
                {contactIsPlaceholder ? (
                  <p className="text-muted-foreground">
                    {site.address.city}, {site.address.state} {site.address.zip}
                    <br />
                    <span className="text-xs">Full street address confirmed on your pickup message.</span>
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    {site.address.line1}, {site.address.line2}
                    <br />
                    {site.address.city}, {site.address.state} {site.address.zip}
                  </p>
                )}
                <p className="mt-1 font-medium text-primary">Usually ready within the hour</p>
              </div>
            </div>
            <div className="mt-5">
              <p id="pickup-time-label" className="mb-2 text-sm font-medium text-foreground/80">Choose a pickup time</p>
              {/*
                Deliberately aria-pressed toggle buttons rather than a radiogroup:
                a radiogroup sets an expectation of arrow-key roving focus, and
                promising that without implementing it is worse than plain
                buttons that each report their own state.
              */}
              <div role="group" aria-labelledby="pickup-time-label" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {slots.slice(0, 9).map((s) => {
                  const full = s.remaining === 0;
                  return (
                    <motion.button
                      key={s.id}
                      type="button"
                      disabled={full}
                      onClick={() => setSlotId(s.id)}
                      aria-pressed={slotId === s.id}
                      aria-label={`Pickup ${s.dayLabel}, ${s.timeLabel}${full ? ", full" : ""}`}
                      whileTap={full ? undefined : { scale: 0.97 }}
                      className={`relative rounded-lg border-2 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                        full
                          ? "cursor-not-allowed border-border opacity-50"
                          : slotId === s.id
                            ? "cursor-pointer border-transparent"
                            : "cursor-pointer border-border hover:border-primary/40"
                      }`}
                    >
                      {slotId === s.id && (
                        <motion.span
                          layoutId="slot-selection"
                          transition={{ type: "spring", stiffness: 480, damping: 38 }}
                          className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary bg-primary/5"
                        />
                      )}
                      <span className="relative block font-display text-sm font-semibold">{s.dayLabel}</span>
                      <span className="relative block text-xs text-muted-foreground">{s.timeLabel}</span>
                      <span className={`relative mt-0.5 block text-[11px] font-semibold ${full ? "text-muted-foreground" : "text-primary"}`}>
                        {full ? "Full" : `${s.remaining} left`}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Friday 1:00 – 2:30 PM is closed for Jummah, so no slots are offered then.
              </p>
            </div>
          </section>

          {/* contact */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 className="font-display text-lg font-bold">Your details</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Full name"><input name="name" required autoComplete="name" className={inputCls} /></Field>
              <Field label="Phone"><input name="phone" required type="tel" autoComplete="tel" className={inputCls} /></Field>
              <Field label="Email" className="sm:col-span-2"><input name="email" required type="email" autoComplete="email" className={inputCls} /></Field>
              <Field label="Order notes (optional)" className="sm:col-span-2"><textarea name="notes" rows={2} className={inputCls} placeholder="Anything for the whole order — cut instructions are set per item in your cart." /></Field>
            </div>
          </section>

          {/* payment */}
          <section className="rounded-card border border-border bg-surface p-6">
            <h2 id="payment-label" className="font-display text-lg font-bold">How will you pay at pickup?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Helps us have your receipt ready. Nothing is charged now.</p>
            <div role="group" aria-labelledby="payment-label" className="mt-4 grid grid-cols-2 gap-3">
              {(["cash", "card"] as Payment[]).map((p) => (
                <motion.button
                  key={p}
                  type="button"
                  onClick={() => setPayment(p)}
                  aria-pressed={payment === p}
                  whileTap={{ scale: 0.98 }}
                  className={`relative rounded-lg border-2 p-4 text-left transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                    payment === p ? "border-transparent" : "border-border hover:border-primary/40"
                  }`}
                >
                  {payment === p && (
                    <motion.span
                      layoutId="tender-selection"
                      transition={{ type: "spring", stiffness: 480, damping: 38 }}
                      className="pointer-events-none absolute inset-0 rounded-lg border-2 border-primary bg-primary/5"
                    />
                  )}
                  <span className="relative font-display font-semibold">{p === "cash" ? "Cash" : "Card"}</span>
                  <span className="relative mt-0.5 block text-xs text-muted-foreground">{p === "cash" ? "Paying cash at the counter" : "Paying by card at the counter"}</span>
                </motion.button>
              ))}
            </div>
            <p className="mt-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              No payment is taken online. You settle the full amount at the counter when you
              collect — we accept cash and all major cards in store.
            </p>
          </section>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Your order</h2>
            <ul className="mt-4 max-h-64 space-y-3 overflow-y-auto pr-1">
              {lines.map(({ product, qty, lineTotal, cut, allowSub }) => (
                <motion.li layout key={product.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="flex-1">
                    <span className="font-medium">{product.name}</span>
                    <span className="text-muted-foreground"> × {qty}{isWeighed(product) ? " lb" : ""}</span>
                    {(cut || !allowSub) && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {cut}{cut && !allowSub ? " · " : ""}{!allowSub ? "no substitutions" : ""}
                      </span>
                    )}
                  </span>
                  <span className="font-semibold">{money(lineTotal)}</span>
                </motion.li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Pickup</dt><dd className="font-semibold">Free</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Sales tax</dt><dd className="font-semibold">{money(tax)}</dd></div>
              {allExempt && <p className="text-xs text-muted-foreground">Groceries are exempt from Texas sales tax.</p>}
              <div className="flex justify-between border-t border-border pt-3 text-base"><dt className="font-display font-bold">Total</dt><dd className="font-display font-bold">{money(total)}</dd></div>
            </dl>
            {anyWeighed && (
              <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Your total is an estimate — items sold by the pound are settled at the counter once weighed.
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary transition-colors hover:bg-primary-dark cursor-pointer disabled:opacity-60"
            >
              {submitting ? "Sending…" : `Place pickup order · ${money(total)}`}
            </button>
            {submitError && (
              <p role="alert" className="mt-3 rounded-lg bg-destructive/10 p-3 text-xs text-destructive">{submitError}</p>
            )}
            <p className="mt-3 text-center text-xs text-muted-foreground">
              You pay at the counter when you collect. Nothing is charged now.
            </p>
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
