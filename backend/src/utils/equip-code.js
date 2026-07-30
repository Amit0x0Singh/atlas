// equipCode (EP00001-style) is computed from MAX(existing code)+1 at
// insert time, not a DB sequence — same reasoning as productCode, see
// product-code.js and microbe-code.js.
export async function getMaxEquipCodeNum(prisma) {
  const rows = await prisma.equipmentMaster.findMany({ select: { equipCode: true } })
  let max = 0
  for (const r of rows) {
    const m = /^EP(\d+)$/i.exec(r.equipCode || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

export function formatEquipCode(num) {
  return `EP${String(num).padStart(5, '0')}`
}
