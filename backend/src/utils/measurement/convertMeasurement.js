/**
 * Pure conversion helpers for the measurement system — no formatting, no
 * strings, just numbers and tier lookups. Kept separate from
 * formatMeasurement.js so "which tier and what number" (testable in
 * isolation) stays independent of "how does it render as text."
 *
 * Mirrors backend/src/utils/measurement/convertMeasurement.js — keep the two
 * in sync; there is no shared package between the two apps to enforce this
 * automatically (same constraint as utils/uom.js).
 *
 * @typedef {import('./measurement.types.js').MeasurementTier} MeasurementTier
 */

import { MEASUREMENT_CATEGORIES } from './measurement.config.js'

/**
 * Picks the display tier for a canonical quantity in the given category.
 * A true zero always resolves to the category's base tier (kg/L/NOS) —
 * "0 mg" is a stranger thing to show a user than "0 kg".
 *
 * @param {string} category
 * @param {number} canonicalQty
 * @returns {MeasurementTier|null}
 */
export function pickTier(category, canonicalQty) {
  const cfg = MEASUREMENT_CATEGORIES[category]
  if (!cfg) return null

  if (canonicalQty === 0) {
    return cfg.units.find((t) => t.factor === 1) || cfg.units[0]
  }

  const abs = Math.abs(canonicalQty)
  for (const tier of cfg.units) {
    if (abs < tier.maxCanonical) return tier
  }
  return cfg.units[cfg.units.length - 1]
}

/**
 * Finds a specific named tier within a category — used for `forceUnit`.
 * Matching is case-insensitive since unit symbols get typed/configured in
 * various cases across the app ("KG" vs "kg", "L" vs "l").
 *
 * @param {string} category
 * @param {string} unitSymbol
 * @returns {MeasurementTier|null}
 */
export function findTier(category, unitSymbol) {
  const cfg = MEASUREMENT_CATEGORIES[category]
  if (!cfg) return null
  const key = String(unitSymbol || '').trim().toLowerCase()
  return cfg.units.find((t) => t.unit.toLowerCase() === key) || null
}

/**
 * Converts a canonical quantity into a specific tier's display number.
 * Pure arithmetic — no rounding/cleanup (that's formatMeasurement's job).
 *
 * @param {number} canonicalQty
 * @param {MeasurementTier} tier
 * @returns {number}
 */
export function toTierValue(canonicalQty, tier) {
  return canonicalQty / tier.factor
}
