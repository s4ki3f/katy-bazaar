import { test } from 'node:test';
import assert from 'node:assert';
import { authorizeInventoryChange } from './inventoryAuthz.js';

test('staff-stock-only-allowed', () => {
  const result = authorizeInventoryChange('staff',
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] },
    { patches: { m1: { price: 6.99, stock: 9 }, r1: { stock: 0 } }, added: [], hidden: ['x9'] }
  );
  assert.deepStrictEqual(result, { ok: true });
});

test('staff-price-change-refused', () => {
  const result = authorizeInventoryChange('staff',
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] },
    { patches: { m1: { price: 0.01, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] }
  );
  assert.deepStrictEqual(result, { ok: false, errors: [{ code: 'staff_may_only_change_stock' }] });
});

test('staff-taxclass-refused', () => {
  const result = authorizeInventoryChange('staff',
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] },
    { patches: { m1: { price: 6.99, stock: 4, taxClass: 'exempt' }, r1: { stock: 12 } }, added: [], hidden: ['x9'] }
  );
  assert.deepStrictEqual(result, { ok: false, errors: [{ code: 'staff_may_only_change_stock' }] });
});

test('staff-hiding-refused', () => {
  const result = authorizeInventoryChange('staff',
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] },
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: [] }
  );
  assert.deepStrictEqual(result, { ok: false, errors: [{ code: 'staff_may_only_change_stock' }] });
});

test('staff-adding-refused', () => {
  const result = authorizeInventoryChange('staff',
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] },
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [{ id: 'zz' }], hidden: ['x9'] }
  );
  assert.deepStrictEqual(result, { ok: false, errors: [{ code: 'staff_may_only_change_stock' }] });
});

test('admin-may-change-anything', () => {
  const result = authorizeInventoryChange('admin',
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] },
    { patches: { m1: { price: 0.01 } }, added: [{ id: 'zz' }], hidden: [] }
  );
  assert.deepStrictEqual(result, { ok: true });
});

test('unknown-role-refused', () => {
  const result = authorizeInventoryChange('owner',
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] },
    { patches: { m1: { price: 6.99, stock: 4 }, r1: { stock: 12 } }, added: [], hidden: ['x9'] }
  );
  assert.deepStrictEqual(result, { ok: false, errors: [{ code: 'unknown_role' }] });
});