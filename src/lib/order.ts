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
  /**
   * Canonical, date-bearing slot id ("2026-09-11T14:30") — the only pickup field the server trusts.
   * `pickupSlot` below is a display label and is deliberately NOT authoritative: it was previously
   * the ONLY thing stored, and a relative label ("Today, 3:00 PM") stops identifying a real slot the
   * next morning, so the shop could not tell which day an order was for.
   */
  pickupSlotId: string;
  pickupSlot: string;
  notes?: string;
  lines: OrderLine[];
  subtotal: number;
  tax: number;
  total: number;
  hasWeighedItems: boolean;
  /**
   * The total this client actually showed the customer, in integer cents.
   *
   * The server prices from the LIVE catalog and the storefront prices from the compiled one, so a
   * price edited mid-visit makes them disagree. Sending the quote lets the server REFUSE rather
   * than silently store a total the customer was never shown and only meets at the counter.
   */
  quotedTotalCents?: number;
};

export type SubmitResult =
  /**
   * `reference` is the one the SERVER minted, and it is the only one the customer may be shown.
   * The browser no longer invents it: the old client-side reference was the last six digits of
   * Date.now(), which repeats every 16m40s, and the API answered the repeat with 200 {ok:true}
   * while storing nothing — so checkout showed a success for an order that did not exist.
   */
  | { ok: true; via: "endpoint" | "whatsapp"; reference?: string }
  | {
      ok: false;
      via: "unconfigured" | "error";
      message: string;
      /** Per-line codes from a 409, so the UI can name the items instead of saying "some items". */
      errors?: { code: string; index?: number; productId?: string }[];
    };

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
  // The app now receives its own orders. WhatsApp remains available as a
  // secondary channel by setting NEXT_PUBLIC_ORDER_ENDPOINT to "whatsapp".
  const endpoint = process.env.NEXT_PUBLIC_ORDER_ENDPOINT ?? "/api/orders";

  if (endpoint) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order),
      });
      const payload = (await res.json().catch(() => null)) as
        | {
            ok?: boolean;
            reference?: string;
            error?: string;
            errors?: { code: string; index?: number; productId?: string }[];
          }
        | null;
      if (!res.ok) {
        // The server states WHY in `error`; surfacing its own words beats a bare status code,
        // and a 409 in particular means the basket no longer matches the live catalog.
        const detail = payload?.error ?? `Order service returned ${res.status}.`;
        return { ok: false, via: "error", message: detail, errors: payload?.errors };
      }
      return { ok: true, via: "endpoint", reference: payload?.reference };
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
