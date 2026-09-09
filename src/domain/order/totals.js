import { taxCentsFor } from '../tax/texas.js';

export function orderTotals(pricedLines, rateBasisPoints) {
  let taxableCents = 0;
  let exemptCents = 0;

  pricedLines.forEach(line => {
    if (line.taxClass === 'taxable') {
      taxableCents += line.lineCents;
    } else {
      exemptCents += line.lineCents;
    }
  });

  const subtotalCents = taxableCents + exemptCents;
  const taxCents = taxCentsFor(taxableCents, rateBasisPoints);
  const totalCents = subtotalCents + taxCents;

  return {
    subtotalCents,
    taxableCents,
    exemptCents,
    taxCents,
    totalCents
  };
}