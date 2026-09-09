import "server-only";
import { getCatalog } from "./catalog";
import { isWeighed } from "@/lib/products";
import { toCents, type PricingCatalog, type TaxClass } from "@/domain";

/** What the counter app needs to render a line it did not price. Server-owned, like the price. */
export type DisplayInfo = Record<string, { name: string; unit: string }>;

/**
 * The catalog as the SERVER trusts it: integer cents, resolved tax class, and whether the item is
 * sold by weight. This is the only thing order pricing is allowed to read — the browser's idea of a
 * price never enters.
 *
 * The pricing map is built with a NULL PROTOTYPE deliberately. `priceLines` already tests membership
 * with `Object.hasOwn`, but a null-prototype object means even a plain `catalog[id]` lookup cannot
 * resolve `"constructor"` or `"toString"` to an inherited function. Defence in depth at the seam
 * where untrusted productIds arrive.
 */
export async function getServerCatalog(): Promise<{ pricing: PricingCatalog; display: DisplayInfo }> {
  const products = await getCatalog();
  const pricing: PricingCatalog = Object.create(null) as PricingCatalog;
  const display: DisplayInfo = Object.create(null) as DisplayInfo;

  for (const p of products) {
    pricing[p.id] = {
      unitCents: toCents(p.price),
      taxClass: p.taxClass as TaxClass,
      weighed: isWeighed(p),
    };
    display[p.id] = { name: p.name, unit: p.unit };
  }
  return { pricing, display };
}
