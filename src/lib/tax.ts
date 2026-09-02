// ─────────────────────────────────────────────────────────────
//  TEXAS SALES TAX
//
//  Texas exempts most unprepared food sold for home consumption:
//  meat, poultry, fish, eggs, dairy, produce, flour, rice, pasta,
//  cereal, cooking oil, canned goods and bakery items.
//
//  Texas TAXES: candy, soft drinks, prepared/hot/ready-to-eat food,
//  dietary supplements, ice, and all non-food items.
//
//  Reference: Texas Comptroller pub. 94-155 "Grocery and Convenience
//  Stores: Taxable and Nontaxable Sales". Classification of individual
//  SKUs is ultimately the retailer's responsibility — items marked
//  `taxReview: true` should be confirmed with the store's CPA.
// ─────────────────────────────────────────────────────────────

import { site } from "./site.config";
import type { Product } from "./products";

export type TaxClass = "exempt" | "taxable";

export type TaxBreakdown = {
  /** sum of line totals for taxable items */
  taxableSubtotal: number;
  /** sum of line totals for exempt items */
  exemptSubtotal: number;
  /** tax due, rounded to cents */
  tax: number;
  /** rate applied */
  rate: number;
  /** true when nothing in the basket is taxable */
  allExempt: boolean;
};

/** Round half-up to cents (avoids 0.1+0.2 style drift). */
function toCents(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Texas computes tax on the taxable portion of the sale, not on the
 * whole basket. Exempt groceries never enter the base.
 */
export function computeTax(
  lines: { product: Product; lineTotal: number }[],
  rate: number = site.taxRate
): TaxBreakdown {
  let taxableSubtotal = 0;
  let exemptSubtotal = 0;

  for (const { product, lineTotal } of lines) {
    if (product.taxClass === "taxable") taxableSubtotal += lineTotal;
    else exemptSubtotal += lineTotal;
  }

  return {
    taxableSubtotal: toCents(taxableSubtotal),
    exemptSubtotal: toCents(exemptSubtotal),
    tax: toCents(taxableSubtotal * rate),
    rate,
    allExempt: taxableSubtotal === 0,
  };
}
