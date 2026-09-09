import { test } from 'node:test';
import assert from 'node:assert';
import { toCents, fromCents } from './cents.js';

test('toCents', (t) => {
  assert.strictEqual(toCents(6.99), 699, 'example-1');
  assert.strictEqual(toCents(0), 0, 'example-2');
  assert.strictEqual(toCents(12.5), 1250, 'example-3');
  assert.strictEqual(toCents(-3.25), -325, 'example-4');
  assert.strictEqual(toCents(0.125), 13, 'example-5');
  assert.strictEqual(toCents(-0.125), -13, 'example-6');
  assert.throws(() => toCents(NaN), TypeError);
  assert.throws(() => toCents(Infinity), TypeError);
  assert.throws(() => toCents(-Infinity), TypeError);
  assert.throws(() => toCents('string'), TypeError);
});

test('fromCents', (t) => {
  assert.strictEqual(fromCents(699), 6.99, 'example-7');
  assert.strictEqual(fromCents(0), 0, 'example-8');
  assert.strictEqual(fromCents(-325), -3.25, 'example-9');
  assert.throws(() => fromCents(699.1), TypeError);
  assert.throws(() => fromCents(NaN), TypeError);
  assert.throws(() => fromCents(Infinity), TypeError);
  assert.throws(() => fromCents(-Infinity), TypeError);
  assert.throws(() => fromCents('string'), TypeError);
});