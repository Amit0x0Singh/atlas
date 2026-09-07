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
      // Sub-milligram tiers (ng, mcg) exist purely so a trace recipe
      // ingredient — e.g. 2e-9 kg/L of a catalyst — reads as "2 mcg"
      // instead of a rounded-away "0 mg". They're the floor tiers, so they
      // carry extra decimal headroom; clean whole-number cases (528 mg,
      // 24 mcg) are unaffected — formatMeasurement.js's toFixed()+Number()
      // cleanup strips the extra trailing zeros automatically.
      { unit: 'ng',    factor: 0.000000000001, maxCanonical: 0.000000001, precision: 3 },
      { unit: 'mcg',   factor: 0.000000001,    maxCanonical: 0.000001,    precision: 3 },
      { unit: 'mg',    factor: 0.000001,       maxCanonical: 0.001,       precision: 3 },
      { unit: 'g',     factor: 0.001,          maxCanonical: 1,           precision: 1 },
      { unit: 'kg',    factor: 1,              maxCanonical: 1000,        precision: 2 },
      { unit: 'tonne', factor: 1000,           maxCanonical: Infinity,    precision: 2 },
    ],
  },
  volume: {
    canonicalUnit: 'L',
    units: [
      // Same reasoning as weight's ng/mcg tiers — nl/mcl are volume's floor.
      // (Volume's canonical is L, so the sub-unit factors sit 1e3 shallower
      // than weight's: 1 mcl = 1e-6 L, 1 nl = 1e-9 L.)
      { unit: 'nl',  factor: 0.000000001, maxCanonical: 0.000001, precision: 3 },
      { unit: 'mcl', factor: 0.000001,    maxCanonical: 0.001,    precision: 3 },
      { unit: 'ml',  factor: 0.001,       maxCanonical: 1,        precision: 3 },
      { unit: 'L',   factor: 1,           maxCanonical: 1000,     precision: 2 },
      { unit: 'kL',  factor: 1000,        maxCanonical: Infinity, precision: 2 },
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
