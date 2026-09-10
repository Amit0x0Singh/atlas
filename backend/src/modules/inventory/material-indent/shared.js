// Shared helpers for the Material Indent module.

import prisma from '../../../db.js'

// A line is "fully covered" once issued reaches requested bar a
// floating-point hair — RELATIVE (1 ppb), never an absolute floor, so a
// legitimately tiny requested qty (2 mg of a solvent) is never treated as
// already-satisfied. requested ≤ 0 ⇒ nothing to issue ⇒ covered.
export function lineCovered(requested, issued) {
  const r = Number(requested)
  const i = Number(issued)
  if (!(r > 0)) return true
  return i >= r - Math.abs(r) * 1e-9
}

// Who sees / works EVERY indent (the Store's Open Indents + Indent History
// queue, the admin "All Indents" view) rather than just their own plant's:
// admins, the dedicated indent-issue grant, and anyone who can issue store
// outward (the Store role does this all day — the Open Indents workflow is a
// Store-Outward action). Everyone else is plant-scoped in listIndents.
export function canSeeAllIndents(reqUser) {
  const p = reqUser?.permissions
  return !!p?.has?.('admin.panel.access')
      || !!p?.has?.('inventory.material-indent.issue')
      || !!p?.has?.('inventory.outward.create')
}

// Recompute one line's status from its requested/issued/rejected state.
export function lineStatusFor(item) {
  if (item.lineStatus === 'REJECTED') return 'REJECTED'
  if (!(Number(item.issuedQty) > 0))       return 'PENDING'
  if (lineCovered(item.requestedQty, item.issuedQty)) return 'ISSUED'
  return 'PARTIAL'
}

// Roll the header status up from its lines. DRAFT/CANCELLED/REJECTED headers
// are terminal here — only OPEN/PARTIAL/COMPLETED are derived from lines.
export function headerStatusFor(items) {
  const live = items.filter(i => i.lineStatus !== 'REJECTED')
  if (live.length === 0) return 'REJECTED' // every line rejected
  if (live.every(i => lineCovered(i.requestedQty, i.issuedQty))) return 'COMPLETED'
  const anyMovement = live.some(i => Number(i.issuedQty) > 0) || items.some(i => i.lineStatus === 'REJECTED')
  return anyMovement ? 'PARTIAL' : 'OPEN'
}

// Adds computed pending/progress fields for the frontend.
export function decorateIndent(indent) {
  const items = (indent.items || []).map(it => ({
    ...it,
    pendingQty: Math.max(0, Number((it.requestedQty - it.issuedQty).toPrecision(12))),
  }))
  const live = items.filter(i => i.lineStatus !== 'REJECTED')
  const doneLines = live.filter(i => lineCovered(i.requestedQty, i.issuedQty)).length
  return {
    ...indent,
    items,
    lineCount: items.length,
    doneLines,
    liveLines: live.length,
    progress: live.length ? Math.round((doneLines / live.length) * 100) : 0,
  }
}

// Attaches each line's RM Master UOM + Conversion Factor so the Open Indents
// issue panel can convert between Inventory UOM (packs/containers) and
// Operational UOM (what the operator types) — same reconciliation Material
// Issue by BOM does.
export async function attachRmUom(indent) {
  if (!indent?.items?.length) return indent
  const codes = [...new Set(indent.items.map(i => i.itemCode))]
  const rms = await prisma.rmMaster.findMany({
    where: { itemCode: { in: codes } },
    select: { itemCode: true, inventoryUom: true, operationalUom: true, conversionFactor: true, conversionRequired: true },
  })
  const byCode = new Map(rms.map(r => [r.itemCode, r]))
  return {
    ...indent,
    items: indent.items.map(it => {
      const rm = byCode.get(it.itemCode)
      return rm
        ? { ...it, inventoryUom: rm.inventoryUom, operationalUom: rm.operationalUom, conversionFactor: rm.conversionFactor, conversionRequired: rm.conversionRequired }
        : it
    }),
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
