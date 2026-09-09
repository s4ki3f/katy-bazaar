import { test } from 'node:test';
import assert from 'node:assert';
import { orderTotals } from './totals.js';

const mixedBasket = {
  pricedLines: [
    { productId: 'm1', qty: 1.5, unitCents: 699, lineCents: 1049, taxClass: 'exempt' },
    { productId: 'd1', qty: 2, unitCents: 199, lineCents: 398, taxClass: 'taxable' },
    { productId: 'g1', qty: 1, unitCents: 449, lineCents: 449, taxClass: 'exempt' }
  ],
  rateBasisPoints: 825
};
const allExempt = {
  pricedLines: [
    { productId: 'm1', qty: 1, unitCents: 699, lineCents: 699, taxClass: 'exempt' }
  ],
  rateBasisPoints: 825
};

test('Mixed Basket', t => {
  const result = orderTotals(mixedBasket.pricedLines, mixedBasket.rateBasisPoints);
  assert.strictEqual(result.subtotalCents, 1896);
  assert.strictEqual(result.taxableCents, 398);
  assert.strictEqual(result.exemptCents, 1498);
  assert.strictEqual(result.taxCents, 33);
  assert.strictEqual(result.totalCents, 1929);
});
test('All Exempt', t => {
  const result = orderTotals(allExempt.pricedLines, allExempt.rateBasisPoints);
  assert.strictEqual(result.subtotalCents, 699);
  assert.strictEqual(result.taxableCents, 0);
  assert.strictEqual(result.exemptCents, 699);
  assert.strictEqual(result.taxCents, 0);
  assert.strictEqual(result.totalCents, 699);
});