import { products, isWeighed } from "@/lib/products";
import { site } from "@/lib/site.config";
import type { CounterLine, CounterOrder } from "./store";

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Unit price implied by the ordered line, so re-weighing stays consistent. */
export function unitPrice(l: CounterLine): number {
  return l.qty > 0 ? l.lineTotal / l.qty : 0;
}

/** What this line actually costs once picked — 0 if it could not be supplied. */
export function settledLineTotal(l: CounterLine): number {
  if (l.pick === "unavailable") return 0;
  const qty = l.actualQty ?? l.qty;
  return round2(unitPrice(l) * qty);
}

export function lineIsWeighed(l: CounterLine): boolean {
  const p = products.find((x) => x.id === l.productId);
  return p ? isWeighed(p) : /per lb/i.test(l.unit);
}

/**
 * Recompute the order after picking. Texas tax applies only to the
 * taxable lines that were actually supplied — same rule as the storefront,
 * resolved through the catalog rather than trusting the submitted total.
 */
export function settleOrder(order: CounterOrder) {
  let subtotal = 0;
  let taxable = 0;

  for (const l of order.lines) {
    const t = settledLineTotal(l);
    subtotal += t;
    const p = products.find((x) => x.id === l.productId);
    if (p?.taxClass === "taxable") taxable += t;
  }

  const tax = round2(taxable * site.taxRate);
  const sub = round2(subtotal);
  return {
    subtotal: sub,
    tax,
    total: round2(sub + tax),
    difference: round2(sub + tax - order.total),
    unavailable: order.lines.filter((l) => l.pick === "unavailable").length,
    outstanding: order.lines.filter((l) => l.pick === "pending").length,
  };
}
