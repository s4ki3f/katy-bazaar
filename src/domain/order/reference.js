export function makeReference(n) {
  if (!Number.isInteger(n) || n < 0 || n > 999999) {
    throw new TypeError('Invalid input');
  }
  const padded = n.toString().padStart(6, '0');
  return `KB-${padded.slice(0, 3)} ${padded.slice(3)}`;
}

export function parseReference(ref) {
  if (typeof ref !== 'string') {
    return null;
  }
  const match = ref.match(/^KB-(\d{3}) (\d{3})$/);
  if (!match) {
    return null;
  }
  return parseInt(`${match[1]}${match[2]}`, 10);
}