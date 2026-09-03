// Shared helpers for the Material Indent module.

const EPS = 0.001

// Recompute one line's status from its requested/issued/rejected state.
export function lineStatusFor(item) {
  if (item.lineStatus === 'REJECTED') return 'REJECTED'
  if (item.issuedQty <= EPS)                       return 'PENDING'
  if (item.issuedQty >= item.requestedQty - EPS)   return 'ISSUED'
  return 'PARTIAL'
}

// Roll the header status up from its lines. DRAFT/CANCELLED/REJECTED headers
// are terminal here — only OPEN/PARTIAL/COMPLETED are derived from lines.
export function headerStatusFor(items) {
  const live = items.filter(i => i.lineStatus !== 'REJECTED')
  if (live.length === 0) return 'REJECTED' // every line rejected
  const allIssued = live.every(i => i.issuedQty >= i.requestedQty - EPS)
  if (allIssued) return 'COMPLETED'
  const anyMovement = live.some(i => i.issuedQty > EPS) || items.some(i => i.lineStatus === 'REJECTED')
  return anyMovement ? 'PARTIAL' : 'OPEN'
}

// Adds computed pending/progress fields for the frontend.
export function decorateIndent(indent) {
  const items = (indent.items || []).map(it => ({
    ...it,
    pendingQty: Math.max(0, +(it.requestedQty - it.issuedQty).toFixed(3)),
  }))
  const live = items.filter(i => i.lineStatus !== 'REJECTED')
  const doneLines = live.filter(i => i.issuedQty >= i.requestedQty - EPS).length
  return {
    ...indent,
    items,
    lineCount: items.length,
    doneLines,
    liveLines: live.length,
    progress: live.length ? Math.round((doneLines / live.length) * 100) : 0,
  }
}

// Next "{DEPT}-MR-{YY}-{0001}" for a department + calendar year. Must be
// called inside a prisma.$transaction (tx) so the sequence bump is atomic.
export async function nextIndentNo(tx, departmentCode) {
  const year = new Date().getFullYear()
  const row = await tx.materialIndentSequence.upsert({
    where:  { departmentCode_year: { departmentCode, year } },
    create: { departmentCode, year, seq: 1 },
    update: { seq: { increment: 1 } },
  })
  const yy = String(year).slice(-2)
  return `${departmentCode}-MR-${yy}-${String(row.seq).padStart(4, '0')}`
}
