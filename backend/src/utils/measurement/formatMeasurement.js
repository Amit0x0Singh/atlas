/**
 * The measurement system's single public entry point. Every module that
 * needs to show a stored quantity to a human — dashboards, tables, reports,
 * PDF export, Excel export, notifications, emails — calls this instead of
 * writing its own `.toFixed()`/unit-guessing logic.
 *
 * `formatMeasurement(value, unit)` accepts the value in WHATEVER unit it's
 * actually paired with right now — canonical (KG/L/NOS) or a friendlier
 * entry unit (g, mg, ml, ...) someone typed — and canonicalizes it via
 * utils/uom.js's toCanonical() before picking a display tier. It does NOT
 * assume `value` is already canonical: (7, 'ML') means seven millilitres,
 * not seven litres, and must convert before comparing against any
 * kg/L-scale threshold. Every quantity column in this schema has a unit
 * sitting right next to it — pass that, in whatever form it's actually in.
 *
 * Performance: pure functions, no React, no classes, no per-call object
 * allocation beyond the single small result object returned. The no-locale
 * path (the default) does plain toFixed()-based cleanup — no Intl
 * construction — so it's cheap enough to call per-cell in a large table.
 * Locale-aware output is opt-in (`{ locale: 'en-IN' }`) and caches its
 * Intl.NumberFormat instances, since *constructing* one is the expensive
 * part, not using it.
 *
 * Mirrors backend/src/utils/measurement/formatMeasurement.js — keep the two
 * in sync; there is no shared package between the two apps to enforce this
 * automatically (same constraint as utils/uom.js).
 *
 * @typedef {import('./measurement.types.js').FormatMeasurementOptions} FormatMeasurementOptions
 * @typedef {import('./measurement.types.js').MeasurementResult} MeasurementResult
 */

import { toCanonical } from '../uom.js'
import { CANONICAL_UNIT_TO_CATEGORY } from './measurement.config.js'
import { DEFAULT_PRECISION, SPECIAL_UNIT_PRECISION } from './measurement.constants.js'
import { pickTier, findTier, toTierValue } from './convertMeasurement.js'

// Intl.NumberFormat instances are expensive to construct, cheap to reuse —
// cached per (locale, precision) pair instead of built fresh on every call.
const formatterCache = new Map()
function getFormatter(locale, precision) {
  const key = `${locale}:${precision}`
  let f = formatterCache.get(key)
  if (!f) {
    f = new Intl.NumberFormat(locale, { minimumFractionDigits: 0, maximumFractionDigits: precision })
    formatterCache.set(key, f)
  }
  return f
}

// toFixed() + Number() round-trip is the cheap, allocation-free way to both
// round to `precision` decimals AND strip trailing zeros in one step —
// Number("2.500") is 2.5, so String(2.5) is "2.5", no regex required.
// Known limitation (not solved here, see architecture note to the user):
// binary floating point means values like 1.005 can round short at some
// precisions — a real decimal library would fix it at a real performance
// cost this formatter can't afford for thousands-of-cells table rendering.
function cleanNumber(num, precision) {
  if (!Number.isFinite(num)) return 0
  return Number(num.toFixed(Math.max(0, precision)))
}

/**
 * @param {number} value          Quantity, in whatever unit `unit` names
 * @param {string} unit           The unit `value` is currently expressed in —
 *                                canonical (KG, L, NOS) or a friendlier entry
 *                                unit (g, mg, ml, ...); CFU/g, %w/w, %v/v pass through
 * @param {FormatMeasurementOptions} [options]
 * @returns {MeasurementResult}
 */
export function formatMeasurement(value, unit, options = {}) {
  const num = Number(value)
  const { precision, forceUnit, locale, showUnit = true } = options

  if (!Number.isFinite(num)) {
    return { value: 0, unit: unit || '', formatted: showUnit ? `0 ${unit || ''}`.trim() : '0', category: 'special' }
  }

  // Canonicalize FIRST — (7, 'ML') must become (0.007, 'L') before any
  // tier/threshold comparison, or a value given in a small unit gets
  // compared against thresholds meant for the canonical (much larger) unit
  // and picks a wildly wrong tier (7 ml was being read as 7 L).
  let canonicalQty, canonicalUnit, category
  try {
    const c = toCanonical(num, unit)
    canonicalQty = c.qty
    // Special units pass through toCanonical lowercased (its internal
    // matching key) — keep the caller's original casing for display
    // (e.g. "CFU/g", not "cfu/g") since nothing here computes with it.
    canonicalUnit = c.special ? unit : c.uom
    category = c.special ? 'special' : (CANONICAL_UNIT_TO_CATEGORY[c.uom] || 'special')
  } catch {
    // Unrecognized unit (a stray annotation like "q.s", a typo, ...) can't
    // be canonicalized or tier-converted at all — clean the raw number and
    // echo the original unit back unchanged rather than throwing it away.
    canonicalQty = num
    canonicalUnit = unit
    category = 'special'
  }

  // Special units (CFU/g, %w/w, %v/v) and anything unrecognized pass through
  // completely unconverted — cleaned for display only, never rescaled.
  // This is the same rule utils/uom.js enforces at the storage layer.
  if (category === 'special') {
    const cleaned = cleanNumber(canonicalQty, precision ?? SPECIAL_UNIT_PRECISION)
    const text = locale ? getFormatter(locale, precision ?? SPECIAL_UNIT_PRECISION).format(cleaned) : String(cleaned)
    return { value: cleaned, unit: canonicalUnit || '', formatted: showUnit && canonicalUnit ? `${text} ${canonicalUnit}` : text, category }
  }

  const tier = forceUnit ? findTier(category, forceUnit) : pickTier(category, canonicalQty)
  if (!tier) {
    // forceUnit didn't match any known tier for this category — fail safe
    // to the category's own auto-picked tier rather than throwing away the
    // value in a table render.
    return formatMeasurement(value, unit, { ...options, forceUnit: undefined })
  }

  const displayValue = toTierValue(canonicalQty, tier)
  const cleaned = cleanNumber(displayValue, precision ?? tier.precision ?? DEFAULT_PRECISION)
  const text = locale ? getFormatter(locale, precision ?? tier.precision ?? DEFAULT_PRECISION).format(cleaned) : String(cleaned)
  // Tier symbols are configured in mixed case (mg/g/kg/ml/kL) — always
  // display UOM values uppercase regardless of the config's own casing.
  const tierUnit = tier.unit.toUpperCase()

  return { value: cleaned, unit: tierUnit, formatted: showUnit ? `${text} ${tierUnit}` : text, category }
}
