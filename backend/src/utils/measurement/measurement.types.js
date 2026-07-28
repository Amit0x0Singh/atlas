/**
 * Pure type documentation for the measurement system — no runtime code.
 * The repo has no TypeScript compiler anywhere (frontend is Vite/JSX,
 * backend is plain Node ESM), so these are JSDoc typedefs: editors that
 * understand JSDoc (VS Code, WebStorm, `// @ts-check`) get full IntelliSense
 * and type-checking from this file with zero build-step changes.
 *
 * Mirrors backend/src/utils/measurement/measurement.types.js — keep the two
 * in sync; there is no shared package between the two apps to enforce this
 * automatically (same constraint as utils/uom.js).
 */

/**
 * @typedef {'weight'|'volume'|'count'|'special'} MeasurementCategory
 */

/**
 * One display tier within a measurement category — e.g. "grams" within
 * "weight". `maxCanonical` is the canonical-unit magnitude (in the
 * category's base unit) below which this tier is the preferred display
 * unit; the last tier in a category's list has `maxCanonical: Infinity`.
 *
 * @typedef {Object} MeasurementTier
 * @property {string} unit          Display unit symbol, e.g. "mg", "kg", "tonne"
 * @property {number} factor        canonicalQty = displayQty * factor
 * @property {number} maxCanonical  Upper bound (exclusive) of canonical magnitude for this tier
 * @property {number} precision     Default decimal places when this tier is shown
 */

/**
 * @typedef {Object} MeasurementCategoryConfig
 * @property {string} canonicalUnit    The unit this category is stored in (KG, L, NOS)
 * @property {MeasurementTier[]} units Tiers ordered smallest -> largest
 */

/**
 * @typedef {Object} FormatMeasurementOptions
 * @property {number} [precision]   Overrides the tier's default decimal places
 * @property {string} [forceUnit]   Skip auto-tier-selection, always display in this unit
 * @property {string} [locale]      BCP-47 locale for grouped/localized number output
 *                                  (e.g. "en-IN"). Omit for the fast, ungrouped path —
 *                                  see formatMeasurement.js's performance note.
 * @property {boolean} [showUnit]   Include the unit symbol in `formatted` (default true)
 */

/**
 * @typedef {Object} MeasurementResult
 * @property {number} value               Cleaned numeric value in the display unit
 * @property {string} unit                Display unit symbol actually used
 * @property {string} formatted            Ready-to-render string, e.g. "528 mg"
 * @property {MeasurementCategory} category
 */

export {}
