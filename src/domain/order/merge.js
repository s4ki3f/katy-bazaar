/**
 * Merge a staff client's order edit onto the stored record, refusing a stale one.
 *
 * WHY THIS EXISTS. The counter app PUTs the WHOLE order document it last read, and the server wrote
 * it back blind. Two tablets holding the same 10:00 snapshot both save: the first records a weighed
 * quantity, the second — still on the old snapshot — marks the order ready and silently reverts that
 * weight, with a fresh `updatedAt` making the clobber look like the newest state. The quantity the
 * charge is computed from simply disappears.
 *
 * A version turns that from a silent revert into a refusal the client can act on: an edit says which
 * version it was based on, and an edit based on anything but the current one is rejected rather than
 * applied. Pure — the caller does the reading and writing, and must do them atomically, because this
 * check is only as good as the write that follows it.
 */

/**
 * Fields the server owns outright. A staff client may send them; it may not change them.
 *
 * `placedBy` is here because it records WHO entered the order, decided at intake from an
 * HMAC-verified token. Leaving it out made it rewritable by exactly the population it exists to
 * distinguish: a staff token could PUT the order back with placedBy "customer", or simply omit it,
 * and the counter would render the result identically to a shopper's own order.
 */
const SERVER_OWNED = ["reference", "placedAt", "receivedAt", "reservation", "placedBy"];

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

export function mergeOrderUpdate(existing, incoming, nowISO) {
  if (!isPlainObject(existing)) return { ok: false, errors: [{ code: "no_such_order" }] };
  if (!isPlainObject(incoming)) return { ok: false, errors: [{ code: "not_an_object" }] };

  // An order written before versioning existed reads as 0, so the first edit adopts it rather than
  // being permanently unsaveable.
  const currentVersion = Number.isInteger(existing.version) ? existing.version : 0;
  const claimed = incoming.version;

  // `undefined` means the client predates versioning; anything else must match exactly. A string
  // "3" is a conflict, not a match — coercing it would let a sloppy client bypass the whole check.
  if (claimed !== undefined && (!Number.isInteger(claimed) || claimed !== currentVersion)) {
    return {
      ok: false,
      errors: [{ code: "version_conflict", expected: currentVersion, received: claimed }],
    };
  }

  const merged = { ...incoming };
  for (const field of SERVER_OWNED) {
    if (Object.hasOwn(existing, field)) merged[field] = existing[field];
    else delete merged[field];
  }
  merged.version = currentVersion + 1;
  merged.updatedAt = nowISO;
  return { ok: true, value: merged };
}
