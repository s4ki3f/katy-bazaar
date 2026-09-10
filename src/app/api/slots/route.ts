import { dbAvailable as kvAvailable } from "@/lib/server/db";
import { offeredSlots, SLOT_CAPACITY, STORE_TIME_ZONE } from "@/lib/server/availability";

export const runtime = "nodejs";

/**
 * Pickup slots with REAL remaining capacity.
 *
 * Public: a shopper needs it before they have anything to identify them with, and it exposes only
 * how busy the counter is. Slots were previously generated in the browser from the VIEWER's
 * timezone with a hashed "remaining" — the same number for everyone, never reduced when somebody
 * booked. Both halves of that are fixed by answering here: the shop's timezone decides the hours,
 * and the counters decide what is left.
 */
export async function GET() {
  if (!kvAvailable) {
    // No datastore means no booking counts. Offer the shop's hours with capacity unknown rather
    // than inventing a number — the old hash is exactly the lie this replaces.
    return Response.json({ slots: [], capacity: SLOT_CAPACITY, timeZone: STORE_TIME_ZONE, available: false });
  }
  return Response.json({
    slots: await offeredSlots(),
    capacity: SLOT_CAPACITY,
    timeZone: STORE_TIME_ZONE,
    available: true,
  });
}
