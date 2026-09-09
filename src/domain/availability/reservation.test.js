import { test } from 'node:test';
import assert from 'node:assert';
import { planReservation } from './reservation.js';

const base = (over = {}) => ({
  lines: [{ productId: 'm1', qty: 1.5 }],
  onHand: { m1: 10, r1: 4 }, reserved: { m1: 2 },
  slotId: '2026-09-11T14:30', slotBooked: 3, slotCapacity: 8, ...over,
});

test('a fitting order yields the slot entry plus one entry per line', () => {
  assert.deepStrictEqual(planReservation(base()), {
    ok: true,
    entries: [
      { key: 'slot:2026-09-11T14:30', delta: 1, max: 8 },
      { key: 'reserve:m1', delta: 150, max: 1000 },
    ],
  });
});

test('quantities are accounted in hundredths so a weighed line stays an integer', () => {
  // MUTANT: passing qty through unscaled — 1.5 into an integer counter truncates or throws.
  const e = planReservation(base({ lines: [{ productId: 'm1', qty: 0.25 }] })).entries;
  assert.strictEqual(e[1].delta, 25);
  assert.ok(Number.isInteger(e[1].delta) && Number.isInteger(e[1].max));
});

test('existing reservations reduce what is available', () => {
  assert.ok(planReservation(base({ lines: [{ productId: 'm1', qty: 8 }] })).ok, '10 on hand - 2 reserved = 8');
  const r = planReservation(base({ lines: [{ productId: 'm1', qty: 8.01 }] }));
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.errors, [{ code: 'insufficient_stock', index: 0, productId: 'm1', requested: 8.01, available: 8 }]);
});

test('an unknown product has zero stock, resolved by OWN property only', () => {
  // MUTANT: `onHand[productId]` truthiness — "constructor" inherits a function and passes.
  for (const pid of ['zz', 'constructor', 'toString', '__proto__']) {
    const r = planReservation(base({ lines: [{ productId: pid, qty: 1 }] }));
    assert.strictEqual(r.ok, false, `${pid} must not resolve`);
    assert.strictEqual(r.errors[0].code, 'insufficient_stock');
    assert.strictEqual(r.errors[0].available, 0);
  }
});

test('a full slot is refused and contributes no slot entry', () => {
  const r = planReservation(base({ slotBooked: 8 }));
  assert.deepStrictEqual(r, { ok: false, errors: [{ code: 'slot_full', slotId: '2026-09-11T14:30' }] });
});

test('slot and stock failures are collected together, slot first', () => {
  const r = planReservation(base({ slotBooked: 8, lines: [{ productId: 'm1', qty: 99 }] }));
  assert.deepStrictEqual(r.errors.map((e) => e.code), ['slot_full', 'insufficient_stock']);
});

test('every failing line is reported with its index, and passing lines produce no entries on failure', () => {
  const r = planReservation(base({ lines: [
    { productId: 'm1', qty: 1 }, { productId: 'r1', qty: 2 }, { productId: 'zz', qty: 1 },
  ] }));
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.entries, undefined, 'a rejected plan applies nothing');
  assert.deepStrictEqual(r.errors.map((e) => e.index), [2]);
});

test('never throws on malformed input', () => {
  for (const bad of [undefined, null, {}, { lines: null }, { lines: [null] }, { lines: [{}] },
                     { lines: [{ productId: 'm1', qty: 'x' }], onHand: null, reserved: null }]) {
    assert.doesNotThrow(() => planReservation(bad), `input ${JSON.stringify(bad)}`);
  }
  assert.strictEqual(planReservation({ lines: [{ productId: 'm1', qty: NaN }], slotCapacity: 8 }).ok, false);
});
