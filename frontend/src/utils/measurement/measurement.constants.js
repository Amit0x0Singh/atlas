/**
 * Small tunable defaults for the measurement system — kept separate from
 * measurement.config.js so category *shape* (units/thresholds) and global
 * *defaults* (precision, locale) can be changed independently.
 *
 * Mirrors backend/src/utils/measurement/measurement.constants.js — keep the
 * two in sync; there is no shared package between the two apps to enforce
 * this automatically (same constraint as utils/uom.js).
 */

// Used only when a category/tier doesn't specify its own precision.
export const DEFAULT_PRECISION = 2

// This app's numbers/dates are formatted 'en-IN' everywhere else
// (toLocaleDateString('en-IN', ...) throughout the codebase) — matched here
// for consistency, but only applied when a caller opts into locale-aware
// output via `{ locale: ... }`. The no-locale path stays the fast default
// (see formatMeasurement.js's performance note).
export const DEFAULT_LOCALE = 'en-IN'

// Precision used for "special" units (CFU/g, %w/w, %v/v) that pass through
// without tier conversion — these are typically already-large or
// already-tiny numbers where more than a couple of decimals is just noise.
export const SPECIAL_UNIT_PRECISION = 2
