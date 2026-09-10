import "server-only";
import { counters as dbCounters, reserveAll, releaseAll, type ReserveEntry } from "./db";
import { slotsForDay, planReservation, type ReservationPlan } from "@/domain";

/**
 * Pickup capacity and stock reservation, resolved on the server.
 *
 * Both were decoration before. Slot "remaining" was a hash of the slot id — the same number for
 * every visitor, never reduced when somebody booked — and stock was displayed but never
 * decremented, so ten shoppers could each be sold the last leg of lamb.
 */

/** The shop is in Katy, Texas. Slot times mean nothing without saying whose clock they are on. */
export const STORE_TIME_ZONE = "America/Chicago";
/** Orders need this long to pick before a slot starts. */
export const LEAD_MINUTES = 60;
/** Orders accepted per hour-long slot. */
export const SLOT_CAPACITY = 8;
/** How many days ahead the storefront offers. */
export const SLOT_DAYS = 3;

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * "Now" as the SHOP experiences it: calendar date, weekday and minutes past midnight in store time.
 *
 * Derived through Intl rather than the server's own zone, because a Vercel function runs wherever it
 * runs — reading `getHours()` there would offer a Katy shopper hours from another timezone, which is
 * the same class of bug as reading it in the browser.
 */
export function storeNow(at: Date = new Date()): { dateISO: string; weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: STORE_TIME_ZONE, weekday: "short",
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  // hour12:false can render midnight as "24" on some ICU versions; fold it back to 0.
  const hour = Number(get("hour")) % 24;
  return {
    dateISO: `${get("year")}-${get("month")}-${get("day")}`,
    weekday: WEEKDAY_INDEX[get("weekday")] ?? 0,
    minutes: hour * 60 + Number(get("minute")),
  };
}

/** Add whole days to a YYYY-MM-DD string without touching timezones. */
function addDays(dateISO: string, days: number): { dateISO: string; weekday: number } {
  const [y, m, d] = dateISO.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    dateISO: `${utc.getUTCFullYear()}-${pad(utc.getUTCMonth() + 1)}-${pad(utc.getUTCDate())}`,
    weekday: utc.getUTCDay(),
  };
}

export type OfferedSlot = { id: string; dateISO: string; startMinutes: number; endMinutes: number; remaining: number };

/**
 * The next `SLOT_DAYS` days of slots with REAL remaining capacity, newest constraint first.
 * A slot the shop has already filled comes back with remaining 0 and the storefront disables it.
 */
export async function offeredSlots(at: Date = new Date()): Promise<OfferedSlot[]> {
  const now = storeNow(at);
  const out: { id: string; dateISO: string; startMinutes: number; endMinutes: number }[] = [];

  for (let d = 0; d < SLOT_DAYS; d++) {
    const day = d === 0 ? { dateISO: now.dateISO, weekday: now.weekday } : addDays(now.dateISO, d);
    // Lead time only trims TODAY; later days open from the shop's normal hours.
    const earliest = d === 0 ? now.minutes + LEAD_MINUTES : 0;
    for (const s of slotsForDay(day.dateISO, day.weekday, earliest)) {
      out.push({ id: s.id, dateISO: day.dateISO, startMinutes: s.startMinutes, endMinutes: s.endMinutes });
    }
  }

  const booked = await dbCounters(out.map((s) => `slot:${s.id}`));
  return out.map((s) => ({
    ...s,
    remaining: Math.max(0, SLOT_CAPACITY - (booked[`slot:${s.id}`] ?? 0)),
  }));
}

/** Counter keys for a basket, so reservations can be released later without recomputing them. */
export function entriesForOrder(lines: { productId: string; qty: number }[], slotIdValue: string): { key: string; delta: number }[] {
  return [
    { key: `slot:${slotIdValue}`, delta: 1 },
    ...lines.map((l) => ({ key: `reserve:${l.productId}`, delta: Math.round(l.qty * 100) })),
  ];
}

/**
 * Decide and then atomically claim stock and a slot.
 *
 * The plan is computed from a READ, so it is stale the instant it exists — `kvReserve` re-checks
 * every ceiling inside one script and writes nothing if reality moved. That second check is the
 * one that actually prevents overselling; the first only produces a good error message.
 */
export async function reserveForOrder(args: {
  lines: { productId: string; qty: number }[];
  onHand: Record<string, number>;
  slotId: string;
}): Promise<{ ok: true; entries: ReserveEntry[] } | { ok: false; plan?: ReservationPlan; blockedKey?: string }> {
  const productKeys = args.lines.map((l) => `reserve:${l.productId}`);
  const counters = await dbCounters([`slot:${args.slotId}`, ...productKeys]);

  const reserved: Record<string, number> = Object.create(null);
  for (const line of args.lines) reserved[line.productId] = (counters[`reserve:${line.productId}`] ?? 0) / 100;

  const plan = planReservation({
    lines: args.lines,
    onHand: args.onHand,
    reserved,
    slotId: args.slotId,
    slotBooked: counters[`slot:${args.slotId}`] ?? 0,
    slotCapacity: SLOT_CAPACITY,
  });
  if (!plan.ok) return { ok: false, plan };

  const applied = await reserveAll(plan.entries);
  if (!applied.ok) return { ok: false, blockedKey: applied.blockedKey };
  return { ok: true, entries: plan.entries };
}

/** Hand a basket's stock and slot back — the order was cancelled, or its goods have left. */
export async function releaseForOrder(entries: { key: string; delta: number }[]): Promise<void> {
  await releaseAll(entries);
}
