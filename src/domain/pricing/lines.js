export function priceLines(requestLines, catalog) {
  const errors = [];
  const lines = [];

  for (let index = 0; index < requestLines.length; index++) {
    const { productId, qty } = requestLines[index];

    if (!Object.hasOwn(catalog, productId)) {
      errors.push({ index, code: 'unknown_product', productId });
      continue;
    }

    const { unitCents, taxClass, weighed } = catalog[productId];

    if (!Number.isFinite(qty) || qty <= 0) {
      errors.push({ index, code: 'qty_invalid', productId });
      continue;
    }

    if (!weighed && !Number.isInteger(qty)) {
      errors.push({ index, code: 'qty_not_integer', productId });
      continue;
    }

    const lineCents = Math.round(Math.abs(unitCents * qty)) * Math.sign(unitCents * qty);
    lines.push({ productId, qty, unitCents, lineCents, taxClass });
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, lines };
}
