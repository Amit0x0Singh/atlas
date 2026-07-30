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
 * Converts a quantity between two units using density (kg per liter) as the
 * KG<->L pivot — mirrors backend/src/utils/uom.js's convertByDensity. Used
 * for client-side display only (e.g. showing an Inventory-UOM stock ceiling
 * in Operational UOM terms); the server always re-derives and validates this
 * itself before actually deducting stock. Same-unit pairs pass through
 * untouched. NOS can't be converted this way — only KG<->L.
 */
export function convertByDensity(qty, fromUom, toUom, density) {
  const from = normalizeUom(fromUom)
  const to = normalizeUom(toUom)
  if (!from || !to) throw new Error(`Unknown unit — cannot convert "${fromUom}" to "${toUom}"`)
  if (from === to) return { qty: Number(qty), converted: false }
  const massOrVolume = (u) => u === CANONICAL.MASS || u === CANONICAL.VOLUME
  if (!massOrVolume(from) || !massOrVolume(to))
    throw new Error(`Cannot convert between ${from} and ${to} — density conversion only supports KG <-> L`)
  if (!density || density <= 0)
    throw new Error('Density is required to convert between KG and L for this item')
  const kg = from === CANONICAL.MASS ? Number(qty) : Number(qty) * density
  return { qty: to === CANONICAL.MASS ? kg : kg / density, converted: true }
}
