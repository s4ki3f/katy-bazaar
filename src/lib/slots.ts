// ─────────────────────────────────────────────────────────────
//  PICKUP SLOTS
//  Generated from the store's real opening hours so the Friday
//  Jummah closure (1:00–2:30 PM) is excluded automatically rather
//  than being special-cased.
// ─────────────────────────────────────────────────────────────

export type Slot = {
  /** stable id, e.g. "2026-08-29T15:00" */
  id: string;
  /** "Today" | "Tomorrow" | "Saturday" */
  dayLabel: string;
  /** "3:00 – 4:00 PM" */
  timeLabel: string;
  start: Date;
  end: Date;
  /** remaining capacity; 0 renders as full */
  remaining: number;
};

/** Opening windows per weekday (0 = Sunday). Minutes from midnight. */
const HOURS: Record<number, [number, number][]> = {
  0: [[8 * 60, 22 * 60]],                       // Sun  8:00 – 10:00 PM
  1: [[9 * 60, 21 * 60]],                       // Mon  9:00 – 9:00 PM
  2: [[9 * 60, 21 * 60]],                       // Tue
  3: [[9 * 60, 21 * 60]],                       // Wed
  4: [[9 * 60, 21 * 60]],                       // Thu
  5: [[9 * 60, 13 * 60], [14 * 60 + 30, 22 * 60]], // Fri — closed 1:00–2:30 for Jummah
  6: [[8 * 60, 22 * 60]],                       // Sat  8:00 – 10:00 PM
};

/** Orders need this long to pick before the slot starts. */
export const LEAD_MINUTES = 60;
/** Orders accepted per slot. */
export const SLOT_CAPACITY = 8;

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function fmtTime(d: Date): string {
  let h = d.getHours();
  const m = d.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return m ? `${h}:${String(m).padStart(2, "0")} ${ap}` : `${h}:00 ${ap}`;
}

function isoLocal(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Deterministic pseudo-capacity so the UI shows a plausible mix of
 * "3 left" / "Full" without a backend. Replace `remaining` with real
 * counts once orders are being stored.
 */
function seededRemaining(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % 10 === 0 ? 0 : Math.max(1, SLOT_CAPACITY - (h % SLOT_CAPACITY));
}

/** Next `days` days of hour-long pickup slots, earliest first. */
export function getPickupSlots(now: Date = new Date(), days = 3): Slot[] {
  const out: Slot[] = [];
  const earliest = new Date(now.getTime() + LEAD_MINUTES * 60_000);

  for (let d = 0; d < days; d++) {
    const day = new Date(now);
    day.setDate(day.getDate() + d);
    day.setHours(0, 0, 0, 0);

    const windows = HOURS[day.getDay()] ?? [];
    for (const [openMin, closeMin] of windows) {
      for (let m = openMin; m + 60 <= closeMin; m += 60) {
        const start = new Date(day);
        start.setMinutes(m);
        if (start < earliest) continue;
        const end = new Date(start.getTime() + 60 * 60_000);
        const id = isoLocal(start);
        out.push({
          id,
          dayLabel: d === 0 ? "Today" : d === 1 ? "Tomorrow" : DAY_NAMES[start.getDay()],
          timeLabel: `${fmtTime(start)} – ${fmtTime(end)}`,
          start,
          end,
          remaining: seededRemaining(id),
        });
      }
    }
  }
  return out;
}
