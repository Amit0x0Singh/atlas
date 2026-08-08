// Display-only Title Case formatter for business text stored lowercase per
// the backend's text-storage standard (backend/src/config/field-normalization-
// rules.js, RULES.LOWER fields — names, category/sub-category, carrier,
// warehouse/location). Never call this on values before sending them back to
// the API — the backend's Prisma Client Extension is the source of truth for
// storage casing; this only affects what the user sees.

/**
 * "potassium humate" -> "Potassium Humate". Non-strings pass through
 * unchanged so it's safe to call on possibly-null/undefined field values.
 */
export function toTitleCase(value) {
  if (typeof value !== 'string' || value === '') return value;
  return value
    .split(' ')
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word))
    .join(' ');
}
