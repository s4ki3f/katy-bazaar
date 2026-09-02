// ─────────────────────────────────────────────────────────────
//  ORDER SUBMISSION
//  The site is a static export (GitHub Pages), so there is no server
//  to receive orders. Two supported sinks:
//
//   1. NEXT_PUBLIC_ORDER_ENDPOINT — POST the order as JSON to any
//      hosted function / form service / webhook.
//   2. WhatsApp fallback — opens a pre-filled message to the store.
//      Works with zero infrastructure and suits how this customer
//      base already contacts the shop.
//
//  Until one of these is configured, submitOrder() reports
//  "unconfigured" and the UI must not claim the order was received.
// ─────────────────────────────────────────────────────────────

import { site } from "./site.config";
import { money } from "./format";

export type OrderLine = {
  /** catalog product id, so the counter app can resolve tax class and unit */
  productId: string;
  name: string;
  unit: string;
  qty: number;
  lineTotal: number;
  cut?: string;
  allowSubstitution: boolean;
};

export type Order = {
  reference: string;
  placedAt: string;
  customer: { name: string; phone: string; email: string };
  pickupSlot: string;
  notes?: string;
  lines: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  hasWeighedItems: boolean;
};

export type SubmitResult =
  | { ok: true; via: "endpoint" | "whatsapp" }
  | { ok: false; via: "unconfigured" | "error"; message: string };

/**
 * Short, human-readable pickup ID. The customer reads it out at the
 * counter, so it is grouped for legibility: KB-482 193.
 */
/**
 * 555-0100 through 555-0199 is the NANP block reserved for fictional use,
 * and 1281000000 is the original scaffold value. Either means "not a real
 * destination".
 */
export function whatsappIsPlaceholder(url: string): boolean {
  const digits = url.replace(/\D/g, "");
  return /^1?\d{3}55501\d{2}$/.test(digits) || /1281000000$/.test(digits);
}

export function orderReference(seed: number = Date.now()): string {
  const digits = String(seed).slice(-6);
  return `KB-${digits.slice(0, 3)} ${digits.slice(3)}`;
}

export function orderToText(o: Order): string {
  const lines = o.lines
    .map((l) => {
      const bits = [`• ${l.qty} × ${l.name} (${l.unit}) — ${money(l.lineTotal)}`];
      if (l.cut) bits.push(`   cut: ${l.cut}`);
      if (!l.allowSubstitution) bits.push("   no substitutions");
      return bits.join("\n");
    })
    .join("\n");

  return [
    `New pickup order`,
    `PICKUP ID: ${o.reference}`,
    `${o.customer.name} · ${o.customer.phone}`,
    `Pickup: ${o.pickupSlot}`,
    "",
    lines,
    "",
    `Subtotal ${money(o.subtotal)}`,
    `Tax ${money(o.tax)}`,
    `Total ${money(o.total)}${o.hasWeighedItems ? " (estimate — weighed items settle at the counter)" : ""}`,
    o.notes ? `\nNotes: ${o.notes}` : "",
    `Customer settles at the counter — no payment taken online.`,
  ].join("\n");
}

export async function submitOrder(order: Order): Promise<SubmitResult> {
  const endpoint = process.env.NEXT_PUBLIC_ORDER_ENDPOINT;

  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      if (!res.ok) return { ok: false, via: "error", message: `Order service returned ${res.status}.` };
      return { ok: true, via: "endpoint" };
    } catch {
      return { ok: false, via: "error", message: "Could not reach the order service." };
    }
  }

  const wa = site.socials.whatsapp;

  if (wa && whatsappIsPlaceholder(wa)) {
    // A placeholder must never look configured in production: real orders
    // would open WhatsApp to a number nobody reads and vanish silently,
    // which is the exact failure this guard exists to prevent.
    if (process.env.NODE_ENV === "production") {
      return {
        ok: false,
        via: "unconfigured",
        message:
          "The WhatsApp number in site.config.ts is still the 555-01xx placeholder, so this order was not sent. Replace it with the store's real number before going live.",
      };
    }
    // In development, let the flow run so it can be demonstrated end to end.
    const phone = wa.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(orderToText(order))}`, "_blank", "noopener");
    return { ok: true, via: "whatsapp" };
  }

  if (wa && !/wa\.me\/1281000000$/.test(wa)) {
    const phone = wa.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(orderToText(order))}`, "_blank", "noopener");
    return { ok: true, via: "whatsapp" };
  }

  return {
    ok: false,
    via: "unconfigured",
    message:
      "Orders have nowhere to go yet, so this one was not sent. Either put the store's real WhatsApp number in site.config.ts (socials.whatsapp, e.g. https://wa.me/12815551234) — no server needed — or set NEXT_PUBLIC_ORDER_ENDPOINT to any URL that accepts a JSON POST. See .env.example.",
  };
}
