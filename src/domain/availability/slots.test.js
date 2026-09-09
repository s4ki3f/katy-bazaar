import { test } from 'node:test';
import assert from 'node:assert';
import { slotsForDay, slotId } from './slots.js';

const ids = (d, w, e) => slotsForDay(d, w, e).map((s) => s.id.slice(11));

test('slot ids are date-bearing and zero-padded', () => {
  assert.strictEqual(slotId('2026-09-11', 870), '2026-09-11T14:30');
  assert.strictEqual(slotId('2026-09-11', 540), '2026-09-11T09:00');
  assert.strictEqual(slotId('2026-09-11', 0), '2026-09-11T00:00');
});

test('Friday excludes the Jummah closure entirely', () => {
  // MUTANT: a single 9:00-10:00PM window would offer 1:00 and 2:00 PM, when the shop is shut.
  const f = ids('2026-09-11', 5, 0);
  assert.deepStrictEqual(f, ['09:00','10:00','11:00','12:00','14:30','15:30','16:30','17:30','18:30','19:30','20:30']);
  assert.ok(!f.includes('13:00'), 'no slot may start during Jummah');
  assert.ok(!f.includes('14:00'), 'the closure runs to 2:30, not 2:00');
});

test('a slot must END by closing time, not merely start before it', () => {
  const mon = ids('2026-09-14', 1, 0);
  assert.strictEqual(mon[mon.length - 1], '20:00', 'last Monday slot ends at 21:00 = close');
  const sun = ids('2026-09-13', 0, 0);
  assert.strictEqual(sun[sun.length - 1], '21:00', 'last Sunday slot ends at 22:00 = close');
});

test('earliestMinutes trims the front of the day, across both Friday windows', () => {
  assert.deepStrictEqual(ids('2026-09-11', 5, 720), ['12:00','14:30','15:30','16:30','17:30','18:30','19:30','20:30']);
  assert.deepStrictEqual(ids('2026-09-11', 5, 900), ['15:30','16:30','17:30','18:30','19:30','20:30']);
});

test('a lead time past closing yields nothing, and never throws', () => {
  assert.deepStrictEqual(slotsForDay('2026-09-14', 1, 1300), []);
  assert.deepStrictEqual(slotsForDay('2026-09-14', 99, 0), [], 'unknown weekday');
  assert.doesNotThrow(() => slotsForDay('2026-09-14', -1, 0));
});

test('weekday hours match the published opening times', () => {
  assert.strictEqual(ids('2026-09-13', 0, 0).length, 14, 'Sun 8:00-22:00');
  assert.strictEqual(ids('2026-09-12', 6, 0).length, 14, 'Sat 8:00-22:00');
  assert.strictEqual(ids('2026-09-14', 1, 0).length, 12, 'Mon 9:00-21:00');
});

test('slots carry their window and are ordered ascending', () => {
  const s = slotsForDay('2026-09-11', 5, 0);
  assert.deepStrictEqual(s[0], { id: '2026-09-11T09:00', startMinutes: 540, endMinutes: 600 });
  const starts = s.map((x) => x.startMinutes);
  assert.deepStrictEqual(starts, [...starts].sort((a, b) => a - b));
});
