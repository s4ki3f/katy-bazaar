import { test } from 'node:test';
import assert from 'node:assert';
import { makeReference, parseReference } from './reference.js';

test('makeReference should format valid integers correctly', () => {
  assert.strictEqual(makeReference(115366), 'KB-115 366');
  assert.strictEqual(makeReference(0), 'KB-000 000');
  assert.strictEqual(makeReference(7), 'KB-000 007');
  assert.strictEqual(makeReference(999999), 'KB-999 999');
});

test('makeReference should throw TypeError for invalid inputs', () => {
  assert.throws(() => makeReference(NaN), TypeError);
  assert.throws(() => makeReference(Infinity), TypeError);
  assert.throws(() => makeReference(-Infinity), TypeError);
  assert.throws(() => makeReference(-1), TypeError);
  assert.throws(() => makeReference(1000000), TypeError);
  assert.throws(() => makeReference(1.5), TypeError);
  assert.throws(() => makeReference('string'), TypeError);
});

test('parseReference should parse valid references correctly', () => {
  assert.strictEqual(parseReference('KB-115 366'), 115366);
  assert.strictEqual(parseReference('KB-000 007'), 7);
});

test('parseReference should return null for malformed references', () => {
  assert.strictEqual(parseReference('KB-115366'), null);
  assert.strictEqual(parseReference('XX-115 366'), null);
  assert.strictEqual(parseReference('KB-11A 366'), null);
  assert.strictEqual(parseReference(null), null);
  assert.strictEqual(parseReference(undefined), null);
});