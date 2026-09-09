import { test } from 'node:test';
import assert from 'node:assert';
import { validateInventoryState } from './inventoryValidate.js';

const ok = (patches = {}, added = [], hidden = []) => ({ patches, added, hidden });

test('accepts a clean overlay and carries the three fields through', () => {
  const state = ok({ m1: { price: 6.99, stock: 4 } }, [], ['x9']);
  assert.deepStrictEqual(validateInventoryState(state), { ok: true, value: state });
});

test('a non-object payload is rejected immediately and nothing else is checked', () => {
  for (const bad of [null, undefined, 'x', 7, true, [], [1, 2]]) {
    assert.deepStrictEqual(validateInventoryState(bad), {
      ok: false, errors: [{ code: 'not_an_object' }],
    }, `payload ${JSON.stringify(bad)}`);
  }
});

test('never throws, whatever it is given', () => {
  const nasty = [null, undefined, 0, '', [], {}, { patches: null }, { patches: { a: null } },
    { patches: { a: 1 } }, { patches: {}, added: null, hidden: null }, { hidden: [1, null] }];
  for (const v of nasty) assert.doesNotThrow(() => validateInventoryState(v), `input ${JSON.stringify(v)}`);
});

test('patches must be a plain object, and per-patch checks are then skipped', () => {
  const r = validateInventoryState({ patches: [], added: [], hidden: [] });
  assert.deepStrictEqual(r, { ok: false, errors: [{ code: 'patches_invalid' }] });
});

test('unknown patch fields are named, and do not suppress the rest', () => {
  const r = validateInventoryState(ok({ m1: { rating: 5, price: 1 } }));
  assert.deepStrictEqual(r, { ok: false, errors: [{ code: 'patch_field_unknown', id: 'm1', field: 'rating' }] });
});

test('each field type rule is enforced', () => {
  const cases = [
    [{ price: -1 }, 'price'], [{ price: 'x' }, 'price'], [{ price: NaN }, 'price'],
    [{ stock: 1.5 }, 'stock'], [{ stock: -2 }, 'stock'],
    [{ unit: 3 }, 'unit'], [{ name: null }, 'name'],
    [{ taxClass: 'vat' }, 'taxClass'],
  ];
  for (const [patch, field] of cases) {
    assert.deepStrictEqual(validateInventoryState(ok({ m1: patch })), {
      ok: false, errors: [{ code: 'patch_field_invalid', id: 'm1', field }],
    }, `patch ${JSON.stringify(patch)}`);
  }
});

test('a non-object patch is reported and its fields are not walked', () => {
  assert.deepStrictEqual(validateInventoryState(ok({ m1: 7 })), {
    ok: false, errors: [{ code: 'patch_invalid', id: 'm1' }],
  });
});

test('an empty or whitespace patch id is reported', () => {
  assert.deepStrictEqual(validateInventoryState(ok({ '  ': { stock: 1 } })), {
    ok: false, errors: [{ code: 'patch_id_invalid', id: '  ' }],
  });
});

test('errors come out in ascending id order regardless of insertion order', () => {
  // MUTANT: iterating Object.keys() unsorted — the error list would follow whatever order the
  // client happened to serialise, so an identical payload could produce two different responses.
  const r = validateInventoryState(ok({ zz: { rating: 1 }, aa: { rating: 1 }, mm: { rating: 1 } }));
  assert.deepStrictEqual(r.errors.map((e) => e.id), ['aa', 'mm', 'zz']);
});

test('fields within a patch are also reported in sorted order', () => {
  const r = validateInventoryState(ok({ m1: { zeta: 1, alpha: 1 } }));
  assert.deepStrictEqual(r.errors.map((e) => e.field), ['alpha', 'zeta']);
});

test('added and hidden must be arrays, and bad hidden entries carry their index', () => {
  assert.deepStrictEqual(validateInventoryState({ patches: {} }).errors,
    [{ code: 'added_invalid' }, { code: 'hidden_invalid' }]);
  assert.deepStrictEqual(validateInventoryState(ok({}, [], ['a', '', 3])).errors,
    [{ code: 'hidden_entry_invalid', index: 1 }, { code: 'hidden_entry_invalid', index: 2 }]);
});

test('every failure is collected, not just the first', () => {
  const r = validateInventoryState({ patches: { m1: { price: -1 } }, added: null, hidden: null });
  assert.deepStrictEqual(r.errors, [
    { code: 'patch_field_invalid', id: 'm1', field: 'price' },
    { code: 'added_invalid' },
    { code: 'hidden_invalid' },
  ]);
});
