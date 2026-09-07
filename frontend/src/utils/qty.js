// Quantity helpers for issue / BOM flows.
//
// Recipe requirements (qtyPerUnit × batch) can legitimately be trace amounts
// — e.g. 2e-9 kg/L of a catalyst. NOTHING here rounds a value toward zero:
//   • roundQty trims to 12 SIGNIFICANT figures (kills IEEE-754 arithmetic
//     noise like 0.1+0.2=0.30000000000000004) without ever flooring a small
//     value — 2e-9 stays 2e-9, 2.4e-8 stays 2.4e-8.
//   • "line covered" is a RELATIVE check (isCovered), never an absolute
//     floor, so a tiny requirement is never silently auto-completed.
// For display, always pass values through humanQty() so a trace amount
// reads as "2 MCG", not "0.000000002 KG" or a rounded-away "0".

import { formatMeasurementString } from './measurement/formatMeasurement.js'
import { pickTier } from './measurement/convertMeasurement.js'
import { CANONICAL_UNIT_TO_CATEGORY } from './measurement/measurement.config.js'
import { unitFamily, toCanonical } from './uom.js'

// Human-readable quantity for an operator — auto-tiers to ng / mcg / mg / g /
// kg (or nl / mcl / ml / L). precision 4 keeps real BOM figures intact
// (1.764 KG, not the default-tier "1.76 KG") while the sub-mg tiers keep
// trace amounts non-zero. When the unit is missing/unrecognised (so no tier
// applies) it degrades to a plain noise-trimmed number + the raw label —
// still never a rounded-away "0".
export const humanQty = (qty, unit) => {
  const fam = unitFamily(unit)
  if (fam === 'MASS' || fam === 'VOLUME') return formatMeasurementString(qty, unit, { precision: 4 })
  const label = String(unit || '').trim().toUpperCase()
  return `${roundQty(qty)}${label ? ` ${label}` : ''}`
}

// Trim IEEE-754 arithmetic noise to 12 significant figures — NOT decimal
// places, so magnitude is irrelevant: 1.764 → 1.764, 2e-9 → 2e-9,
// 0.1 + 0.2 → 0.3. A true 0 (or non-finite) comes back as 0.
export const roundQty = (n) => {
  const x = Number(n)
  if (!Number.isFinite(x) || x === 0) return 0
  return Number(x.toPrecision(12))
}

// A BOM line is "fully covered" only when `issued` reaches `required` bar a
// floating-point hair (a RELATIVE 1e-9, i.e. one part per billion — enough
// to absorb accumulated arithmetic noise, far too tight to ever swallow a
// real shortfall). A zero/negative requirement means "nothing to issue".
export const isCovered = (required, issued) => {
  const r = Number(required)
  const i = Number(issued)
  if (!(r > 0)) return true
  return i >= r - Math.abs(r) * 1e-9
}

// Plain numeric string (no unit) — noise-trimmed, trailing zeros gone.
// Prefer humanQty() for anything shown to an operator.
export const fmtQty = (n) => String(roundQty(n))

// The friendly unit an operator should type a quantity into — the display
// tier (mg / mcg / g / kg  ·  ml / mcl / L) for `refQty`, staying in
// `unit`'s own family. Returns `unit` (uppercased) unchanged for NOS /
// unknown / special units. Used by the QR issue flows so a trace line
// reads "12 MG" to key in, not "0.000012 KG".
export const pickDisplayUnit = (refQty, unit) => {
  try {
    const { qty: canonical, uom } = toCanonical(Math.abs(Number(refQty)) || 0, unit)
    const category = CANONICAL_UNIT_TO_CATEGORY[uom]
    if (!category || category === 'count') return String(unit || '').toUpperCase()
    const tier = pickTier(category, canonical)
    return (tier ? tier.unit : uom).toUpperCase()
  } catch {
    return String(unit || '').toUpperCase()
  }
}
