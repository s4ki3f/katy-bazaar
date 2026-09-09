import { test } from 'node:test';
import assert from 'node:assert';
import { taxCentsFor } from './texas.js';

test('example-1', () => {
  assert.strictEqual(taxCentsFor(0, 825), 0);
});

test('example-2', () => {
  assert.strictEqual(taxCentsFor(100, 825), 8);
});

test('example-3', () => {
  assert.strictEqual(taxCentsFor(200, 825), 17);
});

test('example-4', () => {
  assert.strictEqual(taxCentsFor(1000, 825), 83);
});

test('example-5', () => {
  assert.strictEqual(taxCentsFor(1299, 825), 107);
});

test('example-6', () => {
  assert.strictEqual(taxCentsFor(398, 825), 33);
});

test('example-7', () => {
  assert.strictEqual(taxCentsFor(1000, 0), 0);
});

// Edge cases

test('non-integer taxableCents', () => {
  assert.throws(() => taxCentsFor(100.5, 825), TypeError);
});

test('non-integer rateBasisPoints', () => {
  assert.throws(() => taxCentsFor(100, 825.5), TypeError);
});

test('negative taxableCents', () => {
  assert.throws(() => taxCentsFor(-100, 825), TypeError);
});

test('negative rateBasisPoints', () => {
  assert.throws(() => taxCentsFor(100, -825), TypeError);
});