/**
 * Decide whether a pickup order fits the shop's remaining stock and the chosen slot's capacity,
 * and say exactly which counters to move if it does.
 *
 * WHY THIS EXISTS. Nothing in this shop reserved anything. Stock was displayed and never
 * decremented, so ten customers could each order the last leg of lamb and all be told yes; and
 * pickup-slot capacity was a hash of the slot id — identical for every visitor, never reduced when
 * somebody booked, so "3 left" was decoration.
 *
 * This function only DECIDES. Applying the returned entries is a separate atomic step, because a
 * decision computed from a read is stale the instant it is made; the storage layer re-checks each
 * `max` inside one atomic script and refuses if reality moved underneath us.
 */

/**
 * Counters hold INTEGERS, but a weighed line is 1.5 lb. Quantities are therefore accounted in
 * hundredths of a unit, so 1.5 lb reserves 150 and nothing depends on float accumulation.
 */
const hundredths = (n) => Math.round(n * 100);

/** Own-property lookup only: productId is untrusted, and `onHand["constructor"]` is truthy. */
const own = (obj, key, fallback) =>
  obj !== null && typeof obj === "object" && Object.hasOwn(obj, key) ? obj[key] : fallback;

export function planReservation(request) {
  const req = request ?? {};
  const lines = Array.isArray(req.lines) ? req.lines : [];
  const onHand = req.onHand ?? {};
  const reserved = req.reserved ?? {};
  const slotId = req.slotId ?? "";
  const slotBooked = Number(req.slotBooked ?? 0);
  const slotCapacity = Number(req.slotCapacity ?? 0);

  const errors = [];
  const entries = [];

  if (slotBooked >= slotCapacity) {
    errors.push({ code: "slot_full", slotId });
  } else {
    // Whole orders, so this counter is unscaled — the exception to the hundredths rule above.
    entries.push({ key: `slot:${slotId}`, delta: 1, max: slotCapacity });
  }

  lines.forEach((line, index) => {
    const productId = line?.productId;
    const stock = Number(own(onHand, productId, 0)) || 0;
    const taken = Number(own(reserved, productId, 0)) || 0;
    const available = stock - taken;
    const requested = Number(line?.qty);

    if (!Number.isFinite(requested) || requested > available) {
      errors.push({
        code: "insufficient_stock",
        index,
        productId,
        requested: line?.qty,
        available: available < 0 ? 0 : available,
      });
      return;
    }
    entries.push({
      key: `reserve:${productId}`,
      delta: hundredths(requested),
      max: hundredths(stock),
    });
  });

  return errors.length ? { ok: false, errors } : { ok: true, entries };
}
