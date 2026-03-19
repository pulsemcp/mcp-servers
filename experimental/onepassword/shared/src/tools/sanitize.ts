import {
  OnePasswordItemDetails,
  OnePasswordField,
  OnePasswordSafeItemDetails,
  OnePasswordSafeField,
} from '../types.js';

/**
 * Sanitize a field by removing internal IDs
 */
export function sanitizeField(field: OnePasswordField): OnePasswordSafeField {
  return {
    type: field.type,
    purpose: field.purpose,
    label: field.label,
    value: field.value,
    // Intentionally omit: id, reference
  };
}

/**
 * Sanitize item details by removing all internal IDs
 */
export function sanitizeItemDetails(item: OnePasswordItemDetails): OnePasswordSafeItemDetails {
  return {
    title: item.title,
    category: item.category,
    vault: {
      name: item.vault.name,
      // Intentionally omit: id
    },
    tags: item.tags,
    fields: item.fields?.map(sanitizeField),
    // Intentionally omit: sections (they contain IDs)
    urls: item.urls,
    created_at: item.created_at,
    updated_at: item.updated_at,
    // Intentionally omit: id
  };
}
