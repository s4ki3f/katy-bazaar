"use client";

import Link from "next/link";
import { useCart, CUT_OPTIONS } from "@/context/CartContext";
import { money } from "@/lib/format";
import { computeTax } from "@/lib/tax";
import { isWeighed } from "@/lib/products";
import { ProductImage } from "@/components/ProductImage";
import { MinusIcon, PlusIcon, TrashIcon, ArrowIcon, CartIcon } from "@/components/icons";

export default function CartPage() {
  const { lines, subtotal, count, setQty, setCut, setAllowSub, remove, clear, ready } = useCart();

  if (!ready) {
    return <div className="mx-auto max-w-3xl px-6 py-24 text-center text-muted-foreground">Loading your cart…</div>;
  }

  if (lines.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-6 py-24 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <CartIcon width={30} height={30} />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted-foreground">Looks like you haven&apos;t added anything yet.</p>
        <Link href="/shop" className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-semibold text-on-primary transition-colors hover:bg-primary-dark">
          Start shopping <ArrowIcon width={18} height={18} />
        </Link>
      </div>
    );
  }

  const { tax, allExempt } = computeTax(lines);
  const total = subtotal + tax;
  const anyWeighed = lines.some((l) => isWeighed(l.product));

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Your Cart</h1>
      <p className="mt-1 text-muted-foreground">{count} {count === 1 ? "item" : "items"}</p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* line items */}
        <div className="divide-y divide-border rounded-card border border-border bg-surface">
          {lines.map(({ product, qty, lineTotal, cut, allowSub }) => (
            <div key={product.id} className="flex gap-4 p-4">
              <Link href={`/product/${product.slug}`} className="shrink-0">
                <ProductImage slug={product.slug} name={product.name} category={product.category} className="h-24 w-24 overflow-hidden rounded-lg" />
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex justify-between gap-3">
                  <div>
                    <Link href={`/product/${product.slug}`} className="font-display font-semibold hover:text-primary">{product.name}</Link>
                    <p className="text-xs text-muted-foreground">
                      {product.unit} · {money(product.price)}
                      {isWeighed(product) && <span className="ml-1 text-primary">· qty = lb</span>}
                    </p>
                  </div>
                  <button onClick={() => remove(product.id)} aria-label={`Remove ${product.name}`} className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:bg-muted hover:text-destructive cursor-pointer inline-flex items-center justify-center">
                    <TrashIcon width={18} height={18} />
                  </button>
                </div>
                <div className="mt-auto flex items-center justify-between pt-3">
                  <div className="inline-flex items-center rounded-full border border-border">
                    <button onClick={() => setQty(product.id, qty - 1)} className="flex h-9 w-9 items-center justify-center rounded-l-full hover:bg-muted cursor-pointer" aria-label="Decrease quantity">
                      <MinusIcon width={16} height={16} />
                    </button>
                    <span className="w-12 text-center text-sm font-semibold">
                      {qty}{isWeighed(product) && <span className="text-xs font-normal text-muted-foreground"> lb</span>}
                    </span>
                    <button onClick={() => setQty(product.id, qty + 1)} className="flex h-9 w-9 items-center justify-center rounded-r-full hover:bg-muted cursor-pointer" aria-label="Increase quantity">
                      <PlusIcon width={16} height={16} />
                    </button>
                  </div>
                  <span className="font-display font-bold">{money(lineTotal)}</span>
                </div>

                {/* per-line butcher instruction + substitution preference */}
                <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {product.cuttable && (
                    <label className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs">
                      <span aria-hidden>✎</span>
                      <span className="sr-only">Cut instruction for {product.name}</span>
                      <select
                        value={cut ?? ""}
                        onChange={(e) => setCut(product.id, e.target.value)}
                        className="cursor-pointer bg-transparent text-xs font-semibold outline-none"
                      >
                        <option value="">Cut: butcher&apos;s choice</option>
                        {CUT_OPTIONS.map((c) => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </label>
                  )}
                  <button
                    type="button"
                    onClick={() => setAllowSub(product.id, !allowSub)}
                    aria-pressed={allowSub}
                    className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      allowSub ? "border-border text-muted-foreground hover:border-primary/40" : "border-primary bg-primary/5 text-primary"
                    }`}
                  >
                    {allowSub ? "Substitutions ok" : "No substitutions"}
                  </button>
                </div>
              </div>
            </div>
          ))}
          <div className="flex justify-between p-4">
            <button onClick={clear} className="text-sm font-semibold text-muted-foreground hover:text-destructive cursor-pointer">Clear cart</button>
            <Link href="/shop" className="text-sm font-semibold text-primary hover:underline">Continue shopping →</Link>
          </div>
        </div>

        {/* summary */}
        <aside className="lg:sticky lg:top-36 lg:self-start">
          <div className="rounded-card border border-border bg-surface p-6 shadow-soft">
            <h2 className="font-display text-lg font-bold">Order Summary</h2>

            <div className="mt-4 rounded-lg bg-primary/10 p-3 text-sm font-semibold text-primary">
              Free in-store pickup — ready within the hour.
            </div>

            <dl className="mt-4 space-y-2.5 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">Subtotal</dt><dd className="font-semibold">{money(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Pickup</dt><dd className="font-semibold">Free</dd></div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Sales tax</dt>
                <dd className="font-semibold">{money(tax)}</dd>
              </div>
              {allExempt && (
                <p className="text-xs text-muted-foreground">
                  Groceries are exempt from Texas sales tax — nothing in your cart is taxable.
                </p>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base"><dt className="font-display font-bold">Total</dt><dd className="font-display font-bold">{money(total)}</dd></div>
            </dl>

            {anyWeighed && (
              <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                Items sold by the pound are priced on your requested weight. The final total is
                settled at the counter once your order is weighed.
              </p>
            )}

            <Link href="/checkout" className="mt-5 flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3.5 font-semibold text-on-primary transition-colors hover:bg-primary-dark">
              Checkout <ArrowIcon width={18} height={18} />
            </Link>
            <p className="mt-3 text-center text-xs text-muted-foreground">Secure checkout · Pay in cash or card at pickup</p>
          </div>
        </aside>
      </div>
    </div>
  );
}
