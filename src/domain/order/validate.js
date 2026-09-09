export function validateOrderPayload(payload) {
  const errors = [];

  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
    return { ok: false, errors: [{ code: 'not_an_object' }] };
  }

  const { customer, pickupSlotId, notes, lines } = payload;

  if (typeof customer !== 'object' || customer === null) {
    errors.push({ code: 'customer_missing' });
  } else {
    const { name, phone, email } = customer;

    if (typeof name !== 'string' || name.trim().length === 0 || name.length > 120) {
      errors.push({ code: 'customer_name_invalid' });
    }

    if (typeof phone !== 'string' || phone.trim().length === 0 || phone.length > 40) {
      errors.push({ code: 'customer_phone_invalid' });
    }

    if (email !== undefined && (typeof email !== 'string' || email.length > 200)) {
      errors.push({ code: 'customer_email_invalid' });
    }
  }

  if (typeof pickupSlotId !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(pickupSlotId)) {
    errors.push({ code: 'pickup_slot_invalid' });
  }

  if (notes !== undefined && (typeof notes !== 'string' || notes.length > 500)) {
    errors.push({ code: 'notes_invalid' });
  }

  if (!Array.isArray(lines) || lines.length === 0) {
    errors.push({ code: 'lines_empty' });
  } else if (lines.length > 50) {
    errors.push({ code: 'lines_too_many' });
  } else {
    for (let index = 0; index < lines.length; index++) {
      const line = lines[index];

      if (typeof line !== 'object' || line === null) {
        errors.push({ code: 'line_invalid', index });
      } else {
        const { productId, qty, allowSubstitution, cut } = line;

        if (typeof productId !== 'string' || productId.trim().length === 0) {
          errors.push({ code: 'line_product_invalid', index });
        }

        if (!Number.isFinite(qty) || qty <= 0 || qty > 999) {
          errors.push({ code: 'line_qty_invalid', index });
        }

        if (typeof allowSubstitution !== 'boolean') {
          errors.push({ code: 'line_substitution_invalid', index });
        }

        if (cut !== undefined && (typeof cut !== 'string' || cut.length > 80)) {
          errors.push({ code: 'line_cut_invalid', index });
        }
      }
    }
  }

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  const normalizedValue = {
    customer: {
      name: (customer.name || '').trim(),
      phone: (customer.phone || '').trim(),
      email: customer.email !== undefined ? (customer.email || '').trim() : '',
    },
    pickupSlotId,
    notes: (notes || '').trim(),
    lines: lines.map(line => ({
      productId: line.productId.trim(),
      qty: line.qty,
      allowSubstitution: line.allowSubstitution,
      cut: line.cut !== undefined ? (line.cut || '').trim() : '',
    })),
  };

  return { ok: true, value: normalizedValue };
}
