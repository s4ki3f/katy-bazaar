import { test } from 'node:test';
import assert from 'node:assert';
import { validateOrderPayload } from './validate.js';

// accepts-and-strips-client-money
const acceptsAndStripsClientMoney = {
  customer: { name: '  Ayesha Rahman ', phone: '(281) 555-0134', email: '' },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 'm1', qty: 1.5, allowSubstitution: true, cut: ' boneless ' }],
  subtotal: 1,
  tax: 0,
  total: 1
};
test('accepts-and-strips-client-money', () => {
  const result = validateOrderPayload(acceptsAndStripsClientMoney);
  assert.deepStrictEqual(result, {
    ok: true,
    value: {
      customer: { name: 'Ayesha Rahman', phone: '(281) 555-0134', email: '' },
      pickupSlotId: '2026-09-11T14:30',
      notes: '',
      lines: [{ productId: 'm1', qty: 1.5, allowSubstitution: true, cut: 'boneless' }],
    }
  });
});

// rejects-with-codes
const rejectsWithCodes = {
  customer: { name: '', phone: '281' },
  pickupSlotId: 'tomorrow afternoon',
  lines: []
};
test('rejects-with-codes', () => {
  const result = validateOrderPayload(rejectsWithCodes);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [
      { code: 'customer_name_invalid' },
      { code: 'pickup_slot_invalid' },
      { code: 'lines_empty' }
    ]
  });
});

// rejects-null
const rejectsNull = null;
test('rejects-null', () => {
  const result = validateOrderPayload(rejectsNull);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'not_an_object' }]
  });
});

// type-confusion-name-number
const typeConfusionNameNumber = {
  customer: { name: 12345, phone: '281 555 0134' },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 'm1', qty: 1, allowSubstitution: true }]
};
test('type-confusion-name-number', () => {
  const result = validateOrderPayload(typeConfusionNameNumber);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'customer_name_invalid' }]
  });
});

// type-confusion-email-object
const typeConfusionEmailObject = {
  customer: { name: 'Ayesha', phone: '281 555 0134', email: {} },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 'm1', qty: 1, allowSubstitution: true }]
};
test('type-confusion-email-object', () => {
  const result = validateOrderPayload(typeConfusionEmailObject);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'customer_email_invalid' }]
  });
});

// qty-as-string-rejected
const qtyAsStringRejected = {
  customer: { name: 'Ayesha', phone: '(281) 555-0134', email: '' },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 'm1', qty: '5', allowSubstitution: true }]
};
test('qty-as-string-rejected', () => {
  const result = validateOrderPayload(qtyAsStringRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'line_qty_invalid', index: 0 }]
  });
});

// product-id-as-number-rejected
const productIdAsNumberRejected = {
  customer: { name: 'Ayesha', phone: '(281) 555-0134', email: '' },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 123, qty: 1, allowSubstitution: true }]
};
test('product-id-as-number-rejected', () => {
  const result = validateOrderPayload(productIdAsNumberRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'line_product_invalid', index: 0 }]
  });
});

// substitution-missing-rejected
const substitutionMissingRejected = {
  customer: { name: 'Ayesha', phone: '(281) 555-0134', email: '' },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 'm1', qty: 1 }]
};
test('substitution-missing-rejected', () => {
  const result = validateOrderPayload(substitutionMissingRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'line_substitution_invalid', index: 0 }]
  });
});

// substitution-truthy-string-rejected
const substitutionTruthyStringRejected = {
  customer: { name: 'Ayesha', phone: '(281) 555-0134', email: '' },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 'm1', qty: 1, allowSubstitution: 'yes' }]
};
test('substitution-truthy-string-rejected', () => {
  const result = validateOrderPayload(substitutionTruthyStringRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'line_substitution_invalid', index: 0 }]
  });
});

// cut-as-number-rejected
const cutAsNumberRejected = {
  customer: { name: 'Ayesha', phone: '(281) 555-0134', email: '' },
  pickupSlotId: '2026-09-11T14:30',
  lines: [{ productId: 'm1', qty: 1, allowSubstitution: true, cut: 5 }]
};
test('cut-as-number-rejected', () => {
  const result = validateOrderPayload(cutAsNumberRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'line_cut_invalid', index: 0 }]
  });
});

// array-payload-rejected
const arrayPayloadRejected = [1, 2, 3];
test('array-payload-rejected', () => {
  const result = validateOrderPayload(arrayPayloadRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'not_an_object' }]
  });
});

// string-payload-rejected
const stringPayloadRejected = 'order';
test('string-payload-rejected', () => {
  const result = validateOrderPayload(stringPayloadRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'not_an_object' }]
  });
});

// undefined-payload-rejected
const undefinedPayloadRejected = null;
test('undefined-payload-rejected', () => {
  const result = validateOrderPayload(undefinedPayloadRejected);
  assert.deepStrictEqual(result, {
    ok: false,
    errors: [{ code: 'not_an_object' }]
  });
});