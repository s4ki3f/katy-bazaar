/**
 * Shape-check the shop's inventory overlay before it is stored.
 *
 * The inventory API used to write whatever JSON it was handed straight to storage, and order
 * pricing reads that same record — so one bad price reached every checkout. Never throws.
 */
const PATCH_FIELDS = ["price", "unit", "taxClass", "stock", "name"];

const isPlainObject = (v) => v !== null && typeof v === "object" && !Array.isArray(v);

/** Why this field value is unacceptable, or null when it is fine. */
function fieldIsInvalid(field, value) {
  if (field === "price") return !Number.isFinite(value) || value < 0;
  if (field === "stock") return !Number.isInteger(value) || value < 0;
  if (field === "unit" || field === "name") return typeof value !== "string";
  if (field === "taxClass") return value !== "taxable" && value !== "exempt";
  return false;
}

export function validateInventoryState(payload) {
  if (!isPlainObject(payload)) return { ok: false, errors: [{ code: "not_an_object" }] };

  const { patches, added, hidden } = payload;
  const errors = [];

  if (!isPlainObject(patches)) {
    errors.push({ code: "patches_invalid" });
  } else {
    // Sorted, so the error list never depends on object insertion order.
    for (const id of Object.keys(patches).sort()) {
      if (id.trim() === "") {
        errors.push({ code: "patch_id_invalid", id });
        continue;
      }
      const patch = patches[id];
      if (!isPlainObject(patch)) {
        errors.push({ code: "patch_invalid", id });
        continue;
      }
      for (const field of Object.keys(patch).sort()) {
        if (!PATCH_FIELDS.includes(field)) {
          errors.push({ code: "patch_field_unknown", id, field });
          continue;
        }
        if (fieldIsInvalid(field, patch[field])) {
          errors.push({ code: "patch_field_invalid", id, field });
        }
      }
    }
  }

  if (!Array.isArray(added)) errors.push({ code: "added_invalid" });

  if (!Array.isArray(hidden)) {
    errors.push({ code: "hidden_invalid" });
  } else {
    hidden.forEach((entry, index) => {
      if (typeof entry !== "string" || entry.trim() === "") {
        errors.push({ code: "hidden_entry_invalid", index });
      }
    });
  }

  return errors.length ? { ok: false, errors } : { ok: true, value: { patches, added, hidden } };
}
