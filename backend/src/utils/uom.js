/**
 * UOM (unit of measurement) standardization.
 *
 * The database only ever stores quantities in one of three canonical units —
 * KG (mass), L (volume), NOS (count) — plus a small set of "special" units
 * that aren't mass/volume/count at all (microbial potency, composition
 * ratios) and are therefore never converted or combined with KG/L/NOS
 * quantities in arithmetic.
 *
 * Every write path that accepts a user-typed unit (RM Master, Print Master /
 * pack generation, Container, Recipe/BOM) must run its (qty, unit) pair
 * through `toCanonical()` before saving, so the
 * DB — and therefore every downstream calculation that sums or multiplies
 * quantities from different tables — only ever deals in KG/L/NOS.
 *
 * Mirrors frontend/src/utils/uom.js — keep the two in sync; there is no
 * shared package between the two apps to enforce this automatically.
 */

export const CANONICAL = { MASS: 'KG', VOLUME: 'L', COUNT: 'NOS' }
export const CANONICAL_UNITS = ['KG', 'L', 'NOS']

// Every unit alias seen in real data or frontend dropdowns, mapped to the
// family it belongs to and the factor that converts a quantity in this unit
// to the canonical unit for that family (canonicalQty = rawQty * factor).
// Lookup is case-insensitive — keys here are already lowercase.
const ALIASES = {
  // ── Mass -> KG ──
  kg:  { family: 'MASS', factor: 1 },
  g:   { family: 'MASS', factor: 0.001 },
  gm:  { family: 'MASS', factor: 0.001 },
  gms: { family: 'MASS', factor: 0.001 },
  mg:  { family: 'MASS', factor: 0.000001 },
  // micro/nanogram — used for the friendly issue-entry unit on trace lines
  // (mirrors the mcg/ng display tiers in measurement.config.js).
  mcg: { family: 'MASS', factor: 0.000000001 },
  ug:  { family: 'MASS', factor: 0.000000001 },
  'µg': { family: 'MASS', factor: 0.000000001 },
  ng:  { family: 'MASS', factor: 0.000000000001 },
  mt:  { family: 'MASS', factor: 1000 },

  // ── Volume -> L ──
  l:   { family: 'VOLUME', factor: 1 },
  lt:  { family: 'VOLUME', factor: 1 },
  ltr: { family: 'VOLUME', factor: 1 },
  ml:  { family: 'VOLUME', factor: 0.001 },
  mcl: { family: 'VOLUME', factor: 0.000001 },
  ul:  { family: 'VOLUME', factor: 0.000001 },
  'µl': { family: 'VOLUME', factor: 0.000001 },
  nl:  { family: 'VOLUME', factor: 0.000000001 },

  // ── Count -> NOS ──
  // "bag"/"drum" have no fixed weight — they're tracked as a plain count,
  // same as bottles/boxes, not converted to a weight/volume.
  nos:    { family: 'COUNT', factor: 1 },
  number: { family: 'COUNT', factor: 1 },
  pcs:    { family: 'COUNT', factor: 1 },
  bag:    { family: 'COUNT', factor: 1 },
  bags:   { family: 'COUNT', factor: 1 },
  drum:   { family: 'COUNT', factor: 1 },
  drums:  { family: 'COUNT', factor: 1 },
}

// Units that are not mass/volume/count quantities at all — microbial potency
// (colony-forming units per gram) and composition ratios. These pass through
// completely unchanged: never rescaled, never combined with KG/L/NOS
// quantities. Matched case-insensitively like everything else here.
const SPECIAL_UNITS = new Set(['cfu/g', '%w/w', '%v/v'])

// Canonical spelling for a unit, preserving special units verbatim (in their
// canonical lowercase form) and returning null for anything unrecognized.
export function normalizeUom(rawUnit) {
  const key = String(rawUnit || '').trim().toLowerCase()
  if (SPECIAL_UNITS.has(key)) return key
  const hit = ALIASES[key]
  return hit ? CANONICAL[hit.family] : null
}

/**
 * Converts a (qty, unit) pair to its canonical form.
 * Special units pass through with qty untouched.
 * Throws on an unrecognized unit — callers should validate input against a
 * known unit list before this point, so reaching an unknown unit here means
 * a genuine data problem, not just a routine "no match" the caller should
 * silently swallow.
 */
export function toCanonical(qty, rawUnit) {
  const key = String(rawUnit || '').trim().toLowerCase()
  if (SPECIAL_UNITS.has(key)) {
    return { qty: Number(qty), uom: key, special: true }
  }
  const hit = ALIASES[key]
  if (!hit) throw new Error(`Unknown unit "${rawUnit}" — cannot convert to a canonical unit`)
  return { qty: Number(qty) * hit.factor, uom: CANONICAL[hit.family], special: false }
}

/**
 * Converts a quantity between two units. Handles BOTH:
 *   • sub-unit scale within one family (g <-> kg, mg <-> g, ml <-> L) using
 *     the alias factors — density is NOT needed for these; and
 *   • cross-family mass <-> volume, pivoting through the canonical KG<->L
 *     via `density` (kg per litre) — how a raw material's Inventory UOM and
 *     Operational UOM are reconciled (e.g. stored KG, issued L).
 * Units are matched case-insensitively against the alias table. Genuinely
 * identical units (and equal-factor spellings) pass through untouched and
 * never require density. NOS / special units can't be scaled — only a
 * same-unit passthrough is allowed for those.
 *
 * Mirrors frontend/src/utils/uom.js's convertByDensity — keep in sync.
 */
export function convertByDensity(qty, fromUom, toUom, density) {
  // Tolerate dirty unit strings seen in older recipe data ("gms.", "KG ").
  const clean   = (u) => String(u || '').trim().toLowerCase().replace(/\.+$/, '').trim()
  const fromKey = clean(fromUom)
  const toKey   = clean(toUom)
  const n = Number(qty)

  if (SPECIAL_UNITS.has(fromKey) || SPECIAL_UNITS.has(toKey)) {
    if (fromKey === toKey) return { qty: n, converted: false }
    throw new Error(`Cannot convert "${fromUom}" to "${toUom}"`)
  }

  const a = ALIASES[fromKey]
  const b = ALIASES[toKey]
  if (!a || !b) throw new Error(`Unknown unit — cannot convert "${fromUom}" to "${toUom}"`)

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
  const canonicalFrom = n * a.factor
  const kg = a.family === 'MASS' ? canonicalFrom : canonicalFrom * density
  const canonicalTo = b.family === 'MASS' ? kg : kg / density
  return { qty: canonicalTo / b.factor, converted: true }
}
