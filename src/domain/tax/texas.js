export function taxCentsFor(taxableCents, rateBasisPoints) {
  if (!Number.isInteger(taxableCents) || !Number.isInteger(rateBasisPoints)) {
    throw new TypeError('Both arguments must be integers.');
  }
  if (taxableCents < 0 || rateBasisPoints < 0) {
    throw new TypeError('Both arguments must be non-negative.');
  }

  const tax = (taxableCents * rateBasisPoints + 5000) / 10000;
  return Math.floor(tax);
}