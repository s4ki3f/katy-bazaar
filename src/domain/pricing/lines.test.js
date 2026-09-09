import { test } from 'node:test';
import assert from 'node:assert';
import { priceLines } from './lines.js';

test('priced-basket', async (t) => {
  const requestLines = [{ productId: 'm1', qty: 1.5 }, { productId: 'd1', qty: 2 }, { productId: 'g1', qty: 1 }];
  const catalog = {
    m1: { unitCents: 699, taxClass: 'exempt', weighed: true },
    d1: { unitCents: 199, taxClass: 'taxable', weighed: false },
    g1: { unitCents: 449, taxClass: 'exempt', weighed: false }
  };

  const expected = {
    ok: true,
    lines: [
      { productId: 'm1', qty: 1.5, unitCents: 699, lineCents: 1049, taxClass: 'exempt' },
      { productId: 'd1', qty: 2, unitCents: 199, lineCents: 398, taxClass: 'taxable' },
      { productId: 'g1', qty: 1, unitCents: 449, lineCents: 449, taxClass: 'exempt' }
    ]
  };

  const result = priceLines(requestLines, catalog);
  assert.deepStrictEqual(result, expected);
});

test('rejects-unknown-and-fractional', async (t) => {
  const requestLines = [{ productId: 'zzz', qty: 1 }, { productId: 'd1', qty: 0.5 }];
  const catalog = {
    m1: { unitCents: 699, taxClass: 'exempt', weighed: true },
    d1: { unitCents: 199, taxClass: 'taxable', weighed: false },
    g1: { unitCents: 449, taxClass: 'exempt', weighed: false }
  };

  const expected = {
    ok: false,
    errors: [
      { index: 0, code: 'unknown_product', productId: 'zzz' },
      { index: 1, code: 'qty_not_integer', productId: 'd1' }
    ]
  };

  const result = priceLines(requestLines, catalog);
  assert.deepStrictEqual(result, expected);
});

test('rejects-prototype-chain-keys', async (t) => {
  const requestLines = [{ productId: 'constructor', qty: 1 }, { productId: 'toString', qty: 2 }, { productId: '__proto__', qty: 1 }];
  const catalog = {
    m1: { unitCents: 699, taxClass: 'exempt', weighed: true },
    d1: { unitCents: 199, taxClass: 'taxable', weighed: false },
    g1: { unitCents: 449, taxClass: 'exempt', weighed: false }
  };

  const expected = {
    ok: false,
    errors: [
      { index: 0, code: 'unknown_product', productId: 'constructor' },
      { index: 1, code: 'unknown_product', productId: 'toString' },
      { index: 2, code: 'unknown_product', productId: '__proto__' }
    ]
  };

  const result = priceLines(requestLines, catalog);
  assert.deepStrictEqual(result, expected);
});
