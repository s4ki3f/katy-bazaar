import { test } from 'node:test';
import assert from 'node:assert';
import { mergeOrderUpdate } from './merge.js';

const NOW = '2026-09-09T12:00:00.000Z';
const existing = () => ({
  reference: 'KB-100 200', placedAt: '2026-09-09T10:00:00.000Z', receivedAt: '2026-09-09T10:00:01.000Z',
  reservation: [{ key: 'reserve:m1', delta: 150 }], status: 'new', version: 3, total: 10.49,
});

test('a matching version is accepted and the version advances', () => {
  const r = mergeOrderUpdate(existing(), { status: 'picking', version: 3 }, NOW);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.version, 4);
  assert.strictEqual(r.value.status, 'picking');
  assert.strictEqual(r.value.updatedAt, NOW);
});

test('the second of two edits from the SAME snapshot is refused', () => {
  // This is the bug: both tablets read version 3. The first save wins and the record becomes 4.
  const first = mergeOrderUpdate(existing(), { status: 'picking', version: 3 }, NOW);
  const stored = first.value;
  const second = mergeOrderUpdate(stored, { status: 'ready', version: 3 }, NOW);
  assert.deepStrictEqual(second, {
    ok: false, errors: [{ code: 'version_conflict', expected: 4, received: 3 }],
  });
});

test('a future version is refused too, not just a stale one', () => {
  const r = mergeOrderUpdate(existing(), { status: 'ready', version: 9 }, NOW);
  assert.strictEqual(r.errors[0].code, 'version_conflict');
});

test('a non-integer version never coerces its way through', () => {
  // MUTANT: `Number(claimed) !== current` — "3" would pass and defeat the whole check.
  for (const v of ['3', 3.5, null, NaN, true, {}]) {
    const r = mergeOrderUpdate(existing(), { status: 'ready', version: v }, NOW);
    assert.strictEqual(r.ok, false, `version ${JSON.stringify(v)} must not pass`);
    assert.strictEqual(r.errors[0].code, 'version_conflict');
  }
});

test('a client that sends no version is still allowed through', () => {
  const r = mergeOrderUpdate(existing(), { status: 'picking' }, NOW);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.version, 4);
});

test('server-owned fields are restored from the stored record', () => {
  const r = mergeOrderUpdate(existing(), {
    version: 3, status: 'ready',
    reference: 'KB-999 999', placedAt: '1999-01-01T00:00:00.000Z',
    receivedAt: '1999-01-01T00:00:00.000Z', reservation: [],
  }, NOW);
  assert.strictEqual(r.value.reference, 'KB-100 200');
  assert.strictEqual(r.value.placedAt, '2026-09-09T10:00:00.000Z');
  assert.strictEqual(r.value.receivedAt, '2026-09-09T10:00:01.000Z');
  assert.deepStrictEqual(r.value.reservation, [{ key: 'reserve:m1', delta: 150 }]);
});

test('a server-owned field absent from the stored record is dropped, not carried over', () => {
  // MUTANT: copying only when present would let a client INVENT a reservation for an order
  // that never had one, and releasing it later would manufacture stock.
  const r = mergeOrderUpdate({ reference: 'KB-1 2', status: 'new' }, {
    status: 'picking', reservation: [{ key: 'reserve:m1', delta: 9999 }],
  }, NOW);
  assert.strictEqual(Object.hasOwn(r.value, 'reservation'), false);
});

test('a legacy order with no version adopts one on its first edit', () => {
  const r = mergeOrderUpdate({ reference: 'KB-1 2', status: 'new' }, { status: 'picking', version: 0 }, NOW);
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.value.version, 1);
});

test('missing order and non-object body are distinguished, and nothing throws', () => {
  assert.deepStrictEqual(mergeOrderUpdate(null, { status: 'x' }, NOW), { ok: false, errors: [{ code: 'no_such_order' }] });
  assert.deepStrictEqual(mergeOrderUpdate(existing(), null, NOW), { ok: false, errors: [{ code: 'not_an_object' }] });
  for (const [a, b] of [[undefined, undefined], [[], []], ['x', 'y'], [0, 0]]) {
    assert.doesNotThrow(() => mergeOrderUpdate(a, b, NOW));
  }
});

test('placedBy cannot be rewritten or erased by a staff edit', () => {
  // The field records who ENTERED the order, decided at intake from a verified token. If a staff
  // client could PUT it back as "customer" — or omit it, which a full replace treats the same way —
  // the counter would render a staff-entered order identically to a shopper's own.
  const existing = { reference: 'KB-1 2', placedBy: 'staff', status: 'new', version: 1 };
  const rewritten = mergeOrderUpdate(existing, { version: 1, status: 'picking', placedBy: 'customer' }, NOW);
  assert.strictEqual(rewritten.value.placedBy, 'staff');
  const omitted = mergeOrderUpdate(existing, { version: 1, status: 'picking' }, NOW);
  assert.strictEqual(omitted.value.placedBy, 'staff');
  // And an order that genuinely has none does not acquire one from the client.
  const invented = mergeOrderUpdate({ reference: 'KB-1 2', status: 'new' }, { status: 'picking', placedBy: 'admin' }, NOW);
  assert.strictEqual(Object.hasOwn(invented.value, 'placedBy'), false);
});
