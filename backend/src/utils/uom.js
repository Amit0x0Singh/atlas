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
 * ─── Conversion Factor — GENERIC Inventory-UOM ⇄ Operation-UOM conversion ───
 *
 * `conversionFactor` is NOT specifically density. It is how much Inventory UOM
 * makes up ONE Operation UOM:
 *   • liquid stored in KG, issued in L   → KG per L   (numerically its density)
 *   • pouch  stored in KG, issued in NOS → KG per pouch (unit weight, e.g. 0.003571)
 *
 *   Operation → Inventory :  inventoryQty = operationQty × conversionFactor
 *   Inventory → Operation :  operationQty = inventoryQty ÷ conversionFactor
 *
 * `item` is any object carrying { inventoryUom, operationalUom, conversionRequired,
 * conversionFactor } — an RmMaster row, or an indent/BOM line enriched with those.
 *
 * Mirrors frontend/src/utils/uom.js — keep the two in sync; there is no shared
 * package between the two apps to enforce this automatically.
 */

// Is a real Inventory⇄Operation conversion in force for this item? No when the
// flag is off, or when both UOMs resolve to the same canonical unit (nothing to
// convert). "Conversion Required = No" ⇒ the factor is never applied.
export function conversionActive(item) {
  if (!item || !item.conversionRequired) return false
  const inv = normalizeUom(item.inventoryUom)
  const op  = normalizeUom(item.operationalUom || item.inventoryUom)
  return !!inv && !!op && inv !== op
}

// The validated conversion factor, or a thrown Error the caller surfaces as a
// VALIDATION_ERROR — never a silent 0/1 fallback that would corrupt a stock
// transaction.
export function conversionFactorOf(item) {
  const f = Number(item?.conversionFactor)
  if (!Number.isFinite(f) || f <= 0)
    throw new Error(
      `Conversion Factor is missing or invalid for ${item?.itemCode || item?.itemName || 'this item'} — ` +
      `set a positive Conversion Factor in Item Master before moving its stock`,
    )
  return f
}

// Operation UOM qty → Inventory UOM qty (what actually leaves/enters stock).
export function convertOperationToInventory(operationQty, item) {
  const n = Number(operationQty)
  if (!conversionActive(item)) return n
  return n * conversionFactorOf(item)
}

// Inventory UOM qty → Operation UOM qty (for display / echoing back what was issued).
export function convertInventoryToOperation(inventoryQty, item) {
  const n = Number(inventoryQty)
  if (!conversionActive(item)) return n
  return n / conversionFactorOf(item)
}

/**
 * General quantity conversion between any two units for a given item. Handles:
 *   • same unit / equal-factor aliases              → passthrough
 *   • sub-unit scale within one family (g↔kg, ml↔L)  → alias factors only, no
 *     Conversion Factor needed
 *   • Inventory UOM ⇄ Operation UOM (ANY families, incl. NOS) → the item's
 *     Conversion Factor
 * Throws when a cross-unit pair is not the item's configured Inventory/Operation
 * pair. Replaces the former density-only `convertByDensity`.
 *
 * Mirrors frontend/src/utils/uom.js's convertQty — keep in sync.
 */
export function convertQty(qty, fromUom, toUom, item) {
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

  // Pure sub-unit rescale within one family — never needs a Conversion Factor
  // (e.g. 150 g -> kg = 150 * 0.001 / 1).
  if (a.family === b.family)
    return { qty: n * a.factor / b.factor, converted: true }

  // Cross-unit (incl. anything involving NOS): only valid along THIS item's own
  // Inventory ⇄ Operation axis, bridged by its Conversion Factor.
  if (!conversionActive(item))
    throw new Error(
      `Cannot convert between "${fromUom}" and "${toUom}" — this item has no Inventory/Operation UOM conversion configured`,
    )
  const inv    = normalizeUom(item.inventoryUom)
  const op     = normalizeUom(item.operationalUom || item.inventoryUom)
  const factor = conversionFactorOf(item)
  const fromCanon = CANONICAL[a.family]   // KG | L | NOS
  const toCanon   = CANONICAL[b.family]
  const nInFromCanon = n * a.factor       // qty expressed in its canonical unit

  let resultInToCanon
  if (fromCanon === op && toCanon === inv)      resultInToCanon = nInFromCanon * factor
  else if (fromCanon === inv && toCanon === op) resultInToCanon = nInFromCanon / factor
  else throw new Error(`Cannot convert between "${fromUom}" and "${toUom}" for this item`)

  return { qty: resultInToCanon / b.factor, converted: true }
}
