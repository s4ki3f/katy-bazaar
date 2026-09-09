export function toCents(amount) {
  if (typeof amount !== 'number' || !isFinite(amount)) {
    throw new TypeError('Amount must be a finite number');
  }
  const c = Math.round(Math.abs(amount) * 100);
  return amount < 0 ? -c : c;
}

export function fromCents(cents) {
  if (typeof cents !== 'number' || !Number.isInteger(cents)) {
    throw new TypeError('Cents must be a finite integer');
  }
  return parseFloat((cents / 100).toFixed(2));
}