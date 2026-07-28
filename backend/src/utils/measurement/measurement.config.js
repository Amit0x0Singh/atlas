/**
 * Configuration-driven measurement categories — the single place that
 * defines what display units exist for each stored quantity type and where
 * the boundaries between them sit. Adding a new category (length, area,
 * temperature, ...) means adding one entry here; nothing in
 * convertMeasurement.js or formatMeasurement.js needs to change.
 *
 * Deliberately does NOT redefine the KG/L/NOS canonical-unit alias table —
 * that's owned by utils/uom.js (the storage layer: what a raw user-typed
 * unit like "gm" or "ltr" canonicalizes to before it's ever saved). This
 * config only owns the *display* side: given a value already in its
 * canonical unit, which human-readable tier should it be shown in.
 *
 * Mirrors backend/src/utils/measurement/measurement.config.js — keep the two
 * in sync; there is no shared package between the two apps to enforce this
 * automatically (same constraint as utils/uom.js).
 *
 * @typedef {import('./measurement.types.js').MeasurementCategoryConfig} MeasurementCategoryConfig
 */

/** @type {Record<string, MeasurementCategoryConfig>} */
export const MEASUREMENT_CATEGORIES = {
  weight: {
    canonicalUnit: 'KG',
    units: [
      // mg is the last-resort tier for anything smaller than a gram — no
      // tier below it to fall back on — so it gets more decimal headroom
      // than the others; a genuinely tiny value (0.012 mg) should still
      // read as non-zero instead of rounding straight to "0 mg". Clean
      // whole-number cases (528 mg) are unaffected: the toFixed()+Number()
      // cleanup in formatMeasurement.js strips the extra trailing zeros
      // automatically, so raising this precision never adds visual noise.
      { unit: 'mg',    factor: 0.000001, maxCanonical: 0.001,  precision: 2 },
      { unit: 'g',     factor: 0.001,    maxCanonical: 1,      precision: 1 },
      { unit: 'kg',    factor: 1,        maxCanonical: 1000,   precision: 2 },
      { unit: 'tonne', factor: 1000,     maxCanonical: Infinity, precision: 2 },
    ],
  },
  volume: {
    canonicalUnit: 'L',
    units: [
      // Same reasoning as weight's mg tier above — ml is volume's floor tier.
      { unit: 'ml', factor: 0.001, maxCanonical: 1,        precision: 2 },
      { unit: 'L',  factor: 1,     maxCanonical: 1000,     precision: 2 },
      { unit: 'kL', factor: 1000,  maxCanonical: Infinity, precision: 2 },
    ],
  },
  // No smaller/larger tier — a count is a count. Still routed through the
  // same formatter so precision cleanup and forceUnit/locale options stay
  // consistent with weight/volume instead of every caller special-casing it.
  count: {
    canonicalUnit: 'NOS',
    units: [
      { unit: 'NOS', factor: 1, maxCanonical: Infinity, precision: 0 },
    ],
  },
}

// formatMeasurement.js canonicalizes the incoming (value, unit) pair via
// utils/uom.js's toCanonical() first — this maps the canonical unit that
// comes back (KG/L/NOS) to the category key used above.
export const CANONICAL_UNIT_TO_CATEGORY = {
  KG: 'weight',
  L: 'volume',
  NOS: 'count',
}
