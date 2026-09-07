/**
 * UOM (unit of measurement) standardization — frontend half.
 *
 * The backend only ever stores KG / L / NOS (plus a small set of "special"
 * non-quantity units like CFU/g). This module lets forms show/accept
 * friendlier units (mg, g, kg, ml, L, NOS) and converts to/from the
 * canonical unit at the API boundary, so the user can type "500 g" and the
 * app sends `{ qty: 0.5, uom: 'KG' }`.
 *
 * Mirrors backend/src/utils/uom.js — keep the two in sync; there is no
 * shared package between the two apps to enforce this automatically.
 */

export const CANONICAL = { MASS: 'KG', VOLUME: 'L', COUNT: 'NOS' }
export const CANONICAL_UNITS = ['KG', 'L', 'NOS']

// Display/entry unit options grouped by family, in the order shown in a
// <select> — smallest to largest for mass/volume.
export const MASS_UNITS   = ['mg', 'g', 'kg']
export const VOLUME_UNITS = ['ml', 'L']
export const COUNT_UNITS  = ['NOS']

// Flat list for a single combined dropdown (e.g. a generic "qty + unit"
// field that could be any family) — grouped, not alphabetical, so related
// units stay together.
export const ALL_DISPLAY_UNITS = [...MASS_UNITS, ...VOLUME_UNITS, ...COUNT_UNITS]

// Same alias table as the backend — lookup is case-insensitive.
const ALIASES = {
  // ── Mass -> KG ──
  kg: { family: 'MASS', factor: 1 },
  g:  { family: 'MASS', factor: 0.001 },
  gm: { family: 'MASS', factor: 0.001 },
  gms:{ family: 'MASS', factor: 0.001 },
  mg: { family: 'MASS', factor: 0.000001 },
  mt: { family: 'MASS', factor: 1000 },

  // ── Volume -> L ──
  l:  { family: 'VOLUME', factor: 1 },
  lt: { family: 'VOLUME', factor: 1 },
  ltr:{ family: 'VOLUME', factor: 1 },
  ml: { family: 'VOLUME', factor: 0.001 },

  // ── Count -> NOS ──
  // "bag"/"drum" have no fixed weight — tracked as a plain count, same as
  // bottles/boxes, not converted to a weight/volume.
  nos:    { family: 'COUNT', factor: 1 },
  number: { family: 'COUNT', factor: 1 },
  pcs:    { family: 'COUNT', factor: 1 },
  bag:    { family: 'COUNT', factor: 1 },
  bags:   { family: 'COUNT', factor: 1 },
  drum:   { family: 'COUNT', factor: 1 },
  drums:  { family: 'COUNT', factor: 1 },
}

// Not mass/volume/count at all — microbial potency, composition ratios.
// Passed through unchanged wherever they appear; never offered as a normal
// entry-unit choice, never rescaled.
const SPECIAL_UNITS = new Set(['cfu/g', '%w/w', '%v/v'])

export function isSpecialUnit(rawUnit) {
  return SPECIAL_UNITS.has(String(rawUnit || '').trim().toLowerCase())
}

// Returns 'MASS' | 'VOLUME' | 'COUNT' | 'SPECIAL' | null (unknown unit).
export function unitFamily(rawUnit) {
  const key = String(rawUnit || '').trim().toLowerCase()
  if (SPECIAL_UNITS.has(key)) return 'SPECIAL'
  return ALIASES[key]?.family || null
}

export function normalizeUom(rawUnit) {
  const key = String(rawUnit || '').trim().toLowerCase()
  if (SPECIAL_UNITS.has(key)) return key
  const hit = ALIASES[key]
  return hit ? CANONICAL[hit.family] : null
}

/** Converts a (qty, unit) pair the user typed into its canonical form. */
export function toCanonical(qty, rawUnit) {
  const key = String(rawUnit || '').trim().toLowerCase()
  if (SPECIAL_UNITS.has(key)) return { qty: Number(qty), uom: key, special: true }
  const hit = ALIASES[key]
  if (!hit) throw new Error(`Unknown unit "${rawUnit}" — cannot convert to a canonical unit`)
  return { qty: Number(qty) * hit.factor, uom: CANONICAL[hit.family], special: false }
}

/** Converts a canonical (KG/L/NOS) qty back into a chosen display unit. */
export function fromCanonical(canonicalQty, toUnit) {
  const key = String(toUnit || '').trim().toLowerCase()
  const hit = ALIASES[key]
  if (!hit) throw new Error(`Unknown unit "${toUnit}" — cannot convert from a canonical unit`)
  return Number(canonicalQty) / hit.factor
}

/**
 * Picks a friendly display unit for a canonical mass/volume quantity —
 * e.g. 0.0005 KG reads better as "500 mg" than "0.0005 kg". Count and
 * special units are returned as-is (no smaller/larger unit to pick from).
 */
export function bestDisplayUnit(canonicalQty, canonicalUom) {
  const family = canonicalUom === CANONICAL.MASS ? 'MASS'
    : canonicalUom === CANONICAL.VOLUME ? 'VOLUME'
    : null
  if (!family) return { qty: canonicalQty, unit: canonicalUom }

  const abs = Math.abs(canonicalQty)
  if (family === 'MASS') {
    if (abs > 0 && abs < 0.001) return { qty: canonicalQty / ALIASES.mg.factor, unit: 'mg' }
    if (abs > 0 && abs < 1)     return { qty: canonicalQty / ALIASES.g.factor, unit: 'g' }
    return { qty: canonicalQty, unit: 'kg' }
  }
  // VOLUME
  if (abs > 0 && abs < 1) return { qty: canonicalQty / ALIASES.ml.factor, unit: 'ml' }
  return { qty: canonicalQty, unit: 'L' }
}

/** Convenience: bestDisplayUnit() + a rounded, ready-to-render string. */
export function formatQty(canonicalQty, canonicalUom, decimals = 3) {
  const { qty, unit } = bestDisplayUnit(canonicalQty, canonicalUom)
  const rounded = Number(qty.toFixed(decimals))
  return `${rounded} ${unit}`
}

/**
 * Converts a quantity between two units — mirrors backend/src/utils/uom.js's
 * convertByDensity. Handles BOTH:
 *   • sub-unit scale within one family (g <-> kg, mg <-> g, ml <-> L) using
 *     the alias factors — density is NOT needed for these; and
 *   • cross-family mass <-> volume, pivoting through the canonical KG<->L via
 *     `density` (kg per litre).
 * Used for client-side display / default-qty only; the server always
 * re-derives and validates the real conversion before deducting stock.
 * Genuinely identical units pass through untouched. NOS / special units
 * can't be scaled — only a same-unit passthrough is allowed for those.
 */
export function convertByDensity(qty, fromUom, toUom, density) {
  // Tolerate dirty unit strings seen in older recipe data ("gms.", "KG ").
  const clean   = (u) => String(u || '').trim().toLowerCase().replace(/\.+$/, '').trim()
  const fromKey = clean(fromUom)
  const toKey   = clean(toUom)
  const n = Number(qty)

  // Special units (potency / ratio) — never rescaled.
  if (SPECIAL_UNITS.has(fromKey) || SPECIAL_UNITS.has(toKey)) {
    if (fromKey === toKey) return { qty: n, converted: false }
    throw new Error(`Cannot convert "${fromUom}" to "${toUom}"`)
  }

  const a = ALIASES[fromKey]
  const b = ALIASES[toKey]
  if (!a || !b) throw new Error(`Unknown unit — cannot convert "${fromUom}" to "${toUom}"`)

  // Same unit (or two spellings / equal-factor aliases of it) — nothing to do.
  if (fromKey === toKey || (a.family === b.family && a.factor === b.factor))
    return { qty: n, converted: false }

  if (a.family === 'COUNT' || b.family === 'COUNT')
    throw new Error(`Cannot convert between ${fromUom} and ${toUom} — NOS is a plain count`)

  // Within one family: pure scale factor (e.g. 150 g -> kg = 150 * 0.001 / 1).
  if (a.family === b.family)
    return { qty: n * a.factor / b.factor, converted: true }

  // Cross-family mass <-> volume: pivot through canonical KG <-> L via density.
  if (!density || density <= 0)
    throw new Error('Density is required to convert between mass and volume for this item')
  const canonicalFrom = n * a.factor                                   // KG if MASS, L if VOLUME
  const kg = a.family === 'MASS' ? canonicalFrom : canonicalFrom * density
  const canonicalTo = b.family === 'MASS' ? kg : kg / density          // KG or L
  return { qty: canonicalTo / b.factor, converted: true }
}
