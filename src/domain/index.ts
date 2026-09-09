/**
 * Typed facade over the domain core.
 *
 * The modules under `src/domain/**` are PLAIN JAVASCRIPT and are byte-identical to what passed
 * Forseti's execution gate: esbuild parse, real dependency install, an independent `node --test`
 * suite the implementation could not edit, and per-fixture oracle assertions. Editing them here
 * would silently invalidate that verdict, so nothing in this repo edits them — this file only
 * describes their shapes to TypeScript.
 *
 * Their tests live beside them as `*.test.js` and run with `npm test`.
 */
import { toCents as _toCents, fromCents as _fromCents } from "./money/cents.js";
import { makeReference as _makeReference, parseReference as _parseReference } from "./order/reference.js";
import { taxCentsFor as _taxCentsFor } from "./tax/texas.js";
import { priceLines as _priceLines } from "./pricing/lines.js";
import { orderTotals as _orderTotals } from "./order/totals.js";
import { validateOrderPayload as _validateOrderPayload } from "./order/validate.js";

export type TaxClass = "taxable" | "exempt";

/** What the server trusts about a product. Prices are integer cents — never dollars. */
export type CatalogEntry = { unitCents: number; taxClass: TaxClass; weighed: boolean };
export type PricingCatalog = Record<string, CatalogEntry>;

export type RequestLine = { productId: string; qty: number };
export type PricedLine = {
  productId: string;
  qty: number;
  unitCents: number;
  lineCents: number;
  taxClass: TaxClass;
};

export type PriceErrorCode = "unknown_product" | "qty_invalid" | "qty_not_integer";
export type PriceError = { index: number; code: PriceErrorCode; productId: string };
export type PriceResult = { ok: true; lines: PricedLine[] } | { ok: false; errors: PriceError[] };

export type Totals = {
  subtotalCents: number;
  taxableCents: number;
  exemptCents: number;
  taxCents: number;
  totalCents: number;
};

export type ValidationError = { code: string; index?: number };
export type ValidatedLine = { productId: string; qty: number; allowSubstitution: boolean; cut: string };
export type ValidatedOrder = {
  customer: { name: string; phone: string; email: string };
  pickupSlotId: string;
  notes: string;
  lines: ValidatedLine[];
};
export type ValidateResult =
  | { ok: true; value: ValidatedOrder }
  | { ok: false; errors: ValidationError[] };

/** Dollars -> whole cents. Ties round away from zero. Throws TypeError on a non-finite number. */
export const toCents: (amount: number) => number = _toCents;
/** Whole cents -> dollars, 2dp. Throws TypeError unless given a finite integer. */
export const fromCents: (cents: number) => number = _fromCents;

/**
 * Integer 0..999999 -> "KB-115 366". Throws TypeError on anything else.
 * Carries NO time information: the previous reference was the last six digits of Date.now(), which
 * repeated every 16m40s and made the orders API discard the second order as a duplicate.
 */
export const makeReference: (n: number) => string = _makeReference;
/** Inverse of makeReference. Returns null for anything malformed; never throws. */
export const parseReference: (ref: unknown) => number | null = _parseReference;

/** Texas sales tax on the TAXABLE portion only, in whole cents. Rate is basis points (825 = 8.25%). */
export const taxCentsFor: (taxableCents: number, rateBasisPoints: number) => number = _taxCentsFor;

/**
 * Re-price request lines against the trusted catalog. Client-supplied prices are never read.
 *
 * The cast is load-bearing rather than lazy: TypeScript infers `ok: boolean` from the plain-JS
 * source, which cannot narrow a discriminated union. The runtime shape IS the union — the gate
 * asserts both arms by execution (`rejects-unknown-and-fractional`, `rejects-prototype-chain-keys`,
 * `priced-basket`) — so the declaration here is the accurate one and the inference is the lossy one.
 */
export const priceLines = _priceLines as unknown as (
  requestLines: RequestLine[],
  catalog: PricingCatalog,
) => PriceResult;

/** Total a priced basket. Tax applies to the taxable portion only. */
export const orderTotals: (pricedLines: PricedLine[], rateBasisPoints: number) => Totals = _orderTotals;

/**
 * The trust boundary. Validates and normalises an untrusted browser payload.
 *
 * Never throws, for any input. Strips every money field the client sent — `price`, `lineTotal`,
 * `subtotal`, `tax`, `total` — plus `status`, `reference` and timestamps, because the server derives
 * all of them. The returned `value` contains only the named fields.
 *
 * Cast for the same reason as `priceLines`: plain JS infers `ok: boolean`, which cannot narrow a
 * discriminated union. The runtime union is asserted by the gate across 13 fixtures, including the
 * type-confusion cases (a numeric name, an object email, a string quantity, a missing boolean).
 */
export const validateOrderPayload = _validateOrderPayload as unknown as (
  payload: unknown,
) => ValidateResult;
