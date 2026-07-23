// microbe_code (mc00001-style) is computed from MAX(existing code)+1 at
// insert time, not a DB sequence — a sequence only ever increments (a
// deleted/rolled-back row still permanently consumes a number), so it can
// drift far ahead of the real row count. Same pattern as the RM item-code
// and container next-code helpers elsewhere in this app.
export async function getMaxMicrobeCodeNum(prisma) {
  const rows = await prisma.microbeMaster.findMany({ select: { microbeCode: true } })
  let max = 0
  for (const r of rows) {
    const m = /^mc(\d+)$/i.exec(r.microbeCode || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

export function formatMicrobeCode(num) {
  return `mc${String(num).padStart(5, '0')}`
}
