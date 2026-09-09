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
import { authorizeInventoryChange as _authorizeInventoryChange } from "./admin/inventoryAuthz.js";
import { validateInventoryState as _validateInventoryState } from "./admin/inventoryValidate.js";
import { slotsForDay as _slotsForDay, slotId as _slotId, SLOT_MINUTES as _SLOT_MINUTES } from "./availability/slots.js";
import { planReservation as _planReservation } from "./availability/reservation.js";

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

export type Role = "admin" | "staff";
export type InventoryPatch = Partial<{
  price: number;
  unit: string;
  taxClass: TaxClass;
  stock: number;
  name: string;
}>;
export type InventoryState = {
  patches: Record<string, InventoryPatch>;
  added: unknown[];
  hidden: string[];
};
export type InventoryError = { code: string; id?: string; field?: string; index?: number };
export type InventoryValidateResult =
  | { ok: true; value: InventoryState }
  | { ok: false; errors: InventoryError[] };
export type AuthorizeResult = { ok: true } | { ok: false; errors: InventoryError[] };

/** Shape-check an inventory overlay. Never throws. */
export const validateInventoryState = _validateInventoryState as unknown as (
  payload: unknown,
) => InventoryValidateResult;

/**
 * Authorise a change to the inventory overlay by ROLE and by FIELD.
 *
 * Admin may change anything; staff may change only `stock`. The counter UI has always drawn this
 * line ("staff keep the shelves honest; only admin changes what a thing is or costs") but drew it
 * in the browser, where a staff token plus one curl could set any price to a penny.
 */
/**
 * `current` and `next` are typed as InventoryState rather than `unknown` ON PURPOSE.
 *
 * The module's contract says it never throws, and it very nearly holds — but its guards are default
 * parameters (`current = {}`), which catch `undefined` and NOT `null`, so an explicit null state
 * throws on `state.patches`. Rather than edit a module whose bytes carry a verification verdict, the
 * type makes that input unreachable from TypeScript, and the only caller
 * (`src/app/api/inventory/route.ts`) additionally resolves storage with `?? EMPTY`. Recorded here
 * rather than silently relied upon: the gap is real, it is closed at the boundary, not in the module.
 */
export const authorizeInventoryChange = _authorizeInventoryChange as unknown as (
  role: string,
  current: InventoryState,
  next: InventoryState,
) => AuthorizeResult;

export type Slot = { id: string; startMinutes: number; endMinutes: number };

/**
 * One day's pickup slots from the store's opening hours. Clock-free and timezone-free by design:
 * the caller decides what "today in Katy" means, because the previous version read the VIEWER's
 * timezone and offered hours the shop is not open.
 */
export const slotsForDay: (dateISO: string, weekday: number, earliestMinutes: number) => Slot[] = _slotsForDay;
export const slotId: (dateISO: string, minutes: number) => string = _slotId;
export const SLOT_MINUTES: number = _SLOT_MINUTES;

export type ReserveEntry = { key: string; delta: number; max: number };
export type ReservationRequest = {
  lines: { productId: string; qty: number }[];
  onHand: Record<string, number>;
  reserved: Record<string, number>;
  slotId: string;
  slotBooked: number;
  slotCapacity: number;
};
export type ReservationError =
  | { code: "slot_full"; slotId: string }
  | { code: "insufficient_stock"; index: number; productId: string; requested: number; available: number };
export type ReservationPlan =
  | { ok: true; entries: ReserveEntry[] }
  | { ok: false; errors: ReservationError[] };

/**
 * Decide whether an order fits remaining stock and slot capacity, and name the counters to move.
 *
 * It only DECIDES — the returned entries are applied by `kvReserve`, which re-checks every ceiling
 * inside one atomic script. A decision computed from a read is stale the moment it is made; that
 * re-check is what makes acting on it safe.
 */
export const planReservation = _planReservation as unknown as (req: ReservationRequest) => ReservationPlan;
