import { kvAvailable, KvUnavailableError } from "@/lib/server/kv";
import { createOrder, listOrders } from "@/lib/server/orders-repo";
import { reserveForOrder, releaseForOrder, entriesForOrder } from "@/lib/server/availability";
import { requireRole } from "@/lib/server/session";
import { getServerCatalog } from "@/lib/server/pricing-catalog";
import { site } from "@/lib/site.config";
import {
  validateOrderPayload,
  priceLines,
  orderTotals,
  fromCents,
  type PricedLine,
  type ValidatedLine,
} from "@/domain";

export const runtime = "nodejs";

/** 8.25% as basis points, so no floating-point rate ever enters a money calculation. */
const TAX_BASIS_POINTS = Math.round(site.taxRate * 10000);
function unavailable() {
  return Response.json({ error: new KvUnavailableError().message }, { status: 503 });
}

/**
 * Human label for a slot id such as "2026-09-11T14:30".
 *
 * The id is a WALL-CLOCK time with no zone, so it is parsed as UTC and formatted as UTC: that round
 * trip returns the same wall clock on any server, in any region. Formatting it in the server's local
 * zone would shift a 2:30 PM pickup to some other hour depending on where the function happened to
 * run — which is the class of bug that made the old relative label ("Today, 3:00 PM") meaningless.
 */
function slotLabel(slotId: string): string {
  const start = new Date(`${slotId}:00Z`);
  if (Number.isNaN(start.getTime())) return slotId;
  const end = new Date(start.getTime() + 60 * 60_000);
  const day = new Intl.DateTimeFormat("en-US", {
    timeZone: "UTC", weekday: "short", month: "short", day: "numeric",
  }).format(start);
  const t = (d: Date) =>
    new Intl.DateTimeFormat("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" }).format(d);
  return `${day}, ${t(start)} – ${t(end)}`;
}

/**
 * Read the queue. Both roles work it — picking orders is the staff job — but the check is now an
 * explicit role decision rather than "is this anybody?", so tightening it later is a one-line edit
 * in a place that is obviously about authorisation.
 */
export async function GET(request: Request) {
  if (!kvAvailable) return unavailable();
  const auth = requireRole(request, ["admin", "staff"]);
  if (!auth.ok) return auth.response;
  return Response.json(await listOrders());
}

/**
 * Customers place orders. Deliberately unauthenticated — a shopper has no account — so this handler
 * treats the entire body as hostile and derives everything that matters itself.
 *
 * What the client no longer decides:
 *
 *  • PRICE. Lines are re-priced against the server's catalog (`getServerCatalog`). A client-supplied
 *    price, lineTotal, subtotal, tax or total is dropped by `validateOrderPayload` before it is
 *    reachable, and never read afterwards. Previously the whole body was spread into storage, so a
 *    shopper could name their own total.
 *
 *  • THE REFERENCE. The server mints it from a CSPRNG. It used to be the last six digits of
 *    Date.now() computed in the browser, which repeats every 16m40s — and because a repeat was read
 *    as an idempotent retry and answered 200 {ok:true}, the second customer's order was silently
 *    discarded while their checkout showed success. A collision now redraws instead.
 *
 *  • THE SHAPE. Anything not named by the validator is not stored.
 */
export async function POST(request: Request) {
  if (!kvAvailable) return unavailable();

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Malformed order.", errors: [{ code: "malformed_json" }] }, { status: 400 });
  }

  const validated = validateOrderPayload(body);
  if (!validated.ok) {
    return Response.json(
      { error: "That order could not be accepted.", errors: validated.errors },
      { status: 400 },
    );
  }
  const order = validated.value;

  try {
    const { pricing, display, stock: stockOf } = await getServerCatalog();
    const priced = priceLines(
      order.lines.map((l: ValidatedLine) => ({ productId: l.productId, qty: l.qty })),
      pricing,
    );
    if (!priced.ok) {
      // 409, not 400: the payload was well-formed but no longer agrees with the live catalog —
      // an item was hidden, or a weighed-only quantity was sent for a per-unit product.
      // `errors` carries the zero-based line index and productId so the storefront can name the
      // offending items. Without that the shopper gets "some items are unavailable" over a cart
      // whose lines all still look fine, and the only way out is to empty it.
      return Response.json(
        { error: "Some items are no longer available as ordered.", errors: priced.errors },
        { status: 409 },
      );
    }

    const totals = orderTotals(priced.lines, TAX_BASIS_POINTS);

    // NEVER CHARGE A TOTAL THE CUSTOMER WAS NOT SHOWN.
    //
    // The storefront quotes from the compiled catalog while this handler prices from the LIVE one,
    // so a price the shop edited after the shopper filled their cart makes the two disagree. Storing
    // the server's number silently is how someone gets asked at the counter for money they never saw
    // on the button. If the client tells us what it quoted and we disagree, refuse and say what the
    // price actually is, so the shopper re-confirms against a number they have seen.
    const quoted = (body as { quotedTotalCents?: unknown }).quotedTotalCents;
    if (typeof quoted === "number" && Number.isInteger(quoted) && quoted !== totals.totalCents) {
      return Response.json(
        {
          error: "Prices changed while you were shopping. Please review your cart and try again.",
          errors: [{ code: "price_changed" }],
          quotedTotalCents: quoted,
          actualTotalCents: totals.totalCents,
          actualTotal: fromCents(totals.totalCents),
        },
        { status: 409 },
      );
    }

    // CLAIM STOCK AND THE SLOT BEFORE THE ORDER EXISTS.
    //
    // Nothing used to reserve anything: stock was shown and never decremented, so ten shoppers
    // could each be sold the last leg of lamb, and slot "remaining" was a hash of the slot id that
    // never moved when somebody booked. The claim happens before the record is written so a
    // rejected order leaves nothing behind, and it is applied atomically — the plan below is
    // computed from a read and is stale the instant it exists.
    const onHand: Record<string, number> = Object.create(null);
    for (const pl of priced.lines) onHand[pl.productId] = stockOf[pl.productId] ?? 0;

    const claim = await reserveForOrder({
      lines: priced.lines.map((pl: PricedLine) => ({ productId: pl.productId, qty: pl.qty })),
      onHand,
      slotId: order.pickupSlotId,
    });
    if (!claim.ok) {
      const errors = claim.plan && !claim.plan.ok
        ? claim.plan.errors
        : [{ code: "no_longer_available", key: claim.blockedKey }];
      const slotGone = errors.some((e) => "code" in e && e.code === "slot_full") || claim.blockedKey?.startsWith("slot:");
      return Response.json(
        {
          error: slotGone
            ? "That pickup time just filled up. Please choose another."
            : "Some items are no longer in stock in the quantity you asked for.",
          errors,
        },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();
    const lines = priced.lines.map((pl: PricedLine, i: number) => ({
      productId: pl.productId,
      name: display[pl.productId]?.name ?? pl.productId,
      unit: display[pl.productId]?.unit ?? "",
      qty: pl.qty,
      unitCents: pl.unitCents,
      lineCents: pl.lineCents,
      taxClass: pl.taxClass,
      // Legacy dollar field the counter app still reads (src/lib/admin/totals.ts).
      lineTotal: fromCents(pl.lineCents),
      allowSubstitution: order.lines[i].allowSubstitution,
      cut: order.lines[i].cut,
    }));

    // The reference is minted and the order written in ONE atomic step (SET NX), so two checkouts
    // landing together cannot claim the same one — and because each order is its own key, neither
    // can overwrite the other. The previous code read the whole array and wrote it back, which lost
    // an order per interleaving, and answered the loser 200 {ok:true}.
    const created = await createOrder((reference) => ({
      reference,
      placedAt: now,
      customer: order.customer,
      pickupSlotId: order.pickupSlotId,
      pickupSlot: slotLabel(order.pickupSlotId),
      notes: order.notes,
      lines,
      // Canonical money — integers, server-derived.
      subtotalCents: totals.subtotalCents,
      taxableCents: totals.taxableCents,
      exemptCents: totals.exemptCents,
      taxCents: totals.taxCents,
      totalCents: totals.totalCents,
      taxBasisPoints: TAX_BASIS_POINTS,
      // Legacy dollar mirrors, derived from the canonical cents, for the counter app.
      subtotal: fromCents(totals.subtotalCents),
      tax: fromCents(totals.taxCents),
      total: fromCents(totals.totalCents),
      hasWeighedItems: priced.lines.some((pl: PricedLine) => pricing[pl.productId]?.weighed === true),
      status: "new",
      receivedAt: now,
      updatedAt: now,
      /** Optimistic-concurrency token. Every staff edit must name the version it was based on. */
      version: 1,
      /** What this order claimed, so cancelling or collecting it gives exactly that back. */
      reservation: entriesForOrder(
        priced.lines.map((pl: PricedLine) => ({ productId: pl.productId, qty: pl.qty })),
        order.pickupSlotId,
      ),
    }));

    if (!created) {
      // The claim succeeded but the order did not: hand the stock and slot straight back, or they
      // stay held by an order nobody can see.
      await releaseForOrder(claim.entries);
      // Refuse rather than reuse. Every draw collided, which at 10^6 references means something is
      // wrong; answering 200 with somebody else's reference is what this rewrite exists to prevent.
      return Response.json(
        { error: "Could not allocate a pickup reference. Please try again." },
        { status: 503 },
      );
    }

    return Response.json(
      { ok: true, reference: created.reference, total: created.order.total },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof KvUnavailableError) return unavailable();
    return Response.json({ error: "Could not store the order." }, { status: 500 });
  }
}
