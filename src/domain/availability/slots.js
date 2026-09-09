/**
 * A single day's pickup slots, derived from the store's opening hours.
 *
 * Pure and clock-free: the date, weekday and earliest acceptable start all arrive as arguments, so
 * the same inputs always give the same answer. The previous implementation read the VIEWER's clock
 * and timezone (`getDay`, `setHours`, `getHours`), so a shopper outside Central time was offered
 * hours the shop is not open. Deciding "what day is it in Katy" belongs to the caller, which knows
 * the store's timezone; this module only knows the shop's hours.
 */

/** Opening windows per weekday, in minutes after midnight. 0 = Sunday. */
const HOURS = {
  0: [[480, 1320]],                 // Sun  8:00 AM – 10:00 PM
  1: [[540, 1260]],                 // Mon  9:00 AM –  9:00 PM
  2: [[540, 1260]],                 // Tue
  3: [[540, 1260]],                 // Wed
  4: [[540, 1260]],                 // Thu
  5: [[540, 780], [870, 1320]],     // Fri  closed 1:00–2:30 PM for Jummah
  6: [[480, 1320]],                 // Sat  8:00 AM – 10:00 PM
};

const pad = (n) => String(n).padStart(2, "0");

/** "2026-09-11" + minute 870 -> "2026-09-11T14:30" — the canonical, date-bearing slot id. */
export function slotId(dateISO, minutes) {
  return `${dateISO}T${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

export function slotsForDay(dateISO, weekday, earliestMinutes) {
  const out = [];
  for (const [open, close] of HOURS[weekday] ?? []) {
    for (let m = open; m + 60 <= close; m += 60) {
      // The Friday gap is a real closure, so it simply produces no slot rather than a special case.
      if (m < earliestMinutes) continue;
      out.push({ id: slotId(dateISO, m), startMinutes: m, endMinutes: m + 60 });
    }
  }
  return out;
}

export const SLOT_MINUTES = 60;
