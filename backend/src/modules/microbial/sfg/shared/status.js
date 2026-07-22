// Shared status/expiry math ported 1:1 from microbe.HTM's bStatus()/dL(), so
// every widget (Storage grid, Stock Summary, Dashboard) agrees on what
// "Fresh / Moderate / Near Expiry / Expired / Exhausted" means.
export const RACKS = 15
export const SHELVES = 8
export const SIDES = ['B', 'F']
export const POSITIONS = ['L', 'M', 'R']
export const SLOTS_PER_RACK = SHELVES * SIDES.length * POSITIONS.length // 48
export const TOTAL_SLOTS = RACKS * SLOTS_PER_RACK // 720

export function expiryOf(inward) {
  if (!inward.shelfLifeDays) return null
  const d = new Date(inward.dateOfHarvest)
  d.setDate(d.getDate() + inward.shelfLifeDays)
  return d
}

export function daysLeft(date) {
  if (!date) return null
  return Math.floor((new Date(date) - new Date()) / 86400000)
}

// batches: inward rows belonging to one container, each needs remainingQtyKg
// + a computed expiry (via expiryOf). Mirrors bStatus(bal, batches) exactly.
export function containerStatus(balance, batches) {
  if (balance < 0.001) return 'Exhausted'
  const active = batches.filter((b) => Number(b.remainingQtyKg) > 0.001)
  if (!active.length) return 'Exhausted'
  const minD = Math.min(...active.map((b) => daysLeft(expiryOf(b)) ?? 999))
  if (minD < 0) return 'Expired'
  if (minD <= 30) return 'Near Expiry'
  if (minD <= 90) return 'Moderate'
  return 'Fresh'
}

export function slotCode(rack, shelf, side, position) {
  return `R${String(rack).padStart(2, '0')}-S${shelf}-${side}-${position}`
}
