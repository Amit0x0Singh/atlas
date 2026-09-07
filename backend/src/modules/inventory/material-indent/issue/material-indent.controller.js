import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { resolveIssueQty } from '../../store/outward/services/uom-conversion.service.js'
import { decorateIndent, lineStatusFor, headerStatusFor, lineCovered, attachRmUom } from '../shared.js'

const EPS = 0.001
// "Send back the fresh indent" — decorated + RM-UOM enriched, the exact shape
// getIndent returns so the checklist stays consistent after any mutation.
const freshResponse = (indent) => attachRmUom(decorateIndent(indent))

// POST /material-indent/:id/issue
// body: { itemId, source: 'pack'|'container', sourceId, qty }
// Mirrors bomDirectIssue (outward/create/outward.controller.js): server
// re-derives the Operational→Inventory UOM conversion, checks the balance,
// then in one transaction deducts the pack/container, writes an Outward +
// Stock Ledger row (sourceType/transactionType 'MATERIAL_INDENT'), and bumps
// the indent line. The indent + its lines ARE the persistent state — there
// is no separate session table.
export const issueLine = async (req, res) => {
  const { id } = req.params
  const { itemId, source, sourceId, qty } = req.body
  if (!itemId || !source || !sourceId || qty === undefined)
    return res.status(400).json({ success: false, error: 'itemId, source, sourceId, qty required', code: 'VALIDATION_ERROR' })
  if (!['pack', 'container'].includes(source))
    return res.status(400).json({ success: false, error: 'source must be "pack" or "container"', code: 'VALIDATION_ERROR' })

  try {
    const indent = await prisma.materialIndent.findUnique({ where: { id }, include: { items: true } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    if (!['OPEN', 'PARTIAL'].includes(indent.status))
      return res.status(409).json({ success: false, error: `Indent is ${indent.status.toLowerCase()} — nothing to issue`, code: 'CONFLICT' })

    const line = indent.items.find(i => i.id === itemId)
    if (!line) return res.status(404).json({ success: false, error: 'Item not found on this indent', code: 'NOT_FOUND' })
    if (line.lineStatus === 'REJECTED')
      return res.status(409).json({ success: false, error: 'This line was rejected', code: 'CONFLICT' })

    if (lineCovered(line.requestedQty, line.issuedQty))
      return res.status(409).json({ success: false, error: 'This line is already fully issued', code: 'CONFLICT' })

    const entered = parseFloat(qty)
    if (!entered || entered <= 0)
      return res.status(400).json({ success: false, error: 'Qty must be positive', code: 'VALIDATION_ERROR' })

    let issue, operationalQty, operationalUom
    try {
      ({ inventoryQty: issue, operationalQty, operationalUom } = await resolveIssueQty(line.itemCode, entered))
    } catch (e) {
      return res.status(400).json({ success: false, error: toSafeErrorMessage(e), code: 'VALIDATION_ERROR' })
    }

    const ref = `Indent ${indent.indentNo || indent.id} | ${indent.departmentName}`

    // ── Pack ────────────────────────────────────────────────────────────────
    if (source === 'pack') {
      const pack = await prisma.packDetail.findUnique({ where: { packId: sourceId } })
      if (!pack || pack.status !== 'INWARDED')
        return res.status(404).json({ success: false, error: 'Pack not found or not inwarded', code: 'NOT_FOUND' })
      if (pack.itemCode !== line.itemCode)
        return res.status(400).json({ success: false, error: `Pack item (${pack.itemCode}) does not match ${line.itemName} (${line.itemCode})`, code: 'VALIDATION_ERROR' })
      if (issue > pack.remainingQty + EPS)
        return res.status(400).json({ success: false, error: `Qty (${issue}) exceeds pack balance (${pack.remainingQty})`, code: 'VALIDATION_ERROR' })

      const result = await prisma.$transaction(async (tx) => {
        await tx.packDetail.update({ where: { packId: sourceId }, data: { remainingQty: pack.remainingQty - issue } })
        await tx.outward.create({ data: { indentId: indent.id, sourceId, sourceType: 'MATERIAL_INDENT', rmCode: line.itemCode, qtyIssued: issue, operationalQty, operationalUom, remarks: ref } })
        const prev = await tx.stockLedger.findFirst({ where: { itemCode: line.itemCode }, orderBy: { timestamp: 'desc' } })
        await tx.stockLedger.create({ data: { itemCode: line.itemCode, sourceId, transactionType: 'MATERIAL_INDENT', outQty: issue, balance: (prev?.balance || 0) - issue, reference: ref } })
        return applyLineIssue(tx, indent, line, operationalQty)
      })
      return res.json({ success: true, issued: issue, remaining: result.lineRemaining, data: await freshResponse(result.fresh) })
    }

    // ── Container ───────────────────────────────────────────────────────────
    const container = await prisma.containerMaster.findUnique({ where: { containerId: sourceId } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })
    if (container.itemCode !== line.itemCode)
      return res.status(400).json({ success: false, error: `Container item (${container.itemCode}) does not match ${line.itemName} (${line.itemCode})`, code: 'VALIDATION_ERROR' })
    if (issue > container.currentQty + EPS)
      return res.status(400).json({ success: false, error: `Qty (${issue}) exceeds container balance (${container.currentQty})`, code: 'VALIDATION_ERROR' })

    const result = await prisma.$transaction(async (tx) => {
      await tx.containerMaster.update({ where: { containerId: sourceId }, data: { currentQty: { decrement: issue } } })
      await tx.outward.create({ data: { indentId: indent.id, sourceId, sourceType: 'MATERIAL_INDENT', rmCode: line.itemCode, qtyIssued: issue, operationalQty, operationalUom, remarks: ref } })
      const prev = await tx.stockLedger.findFirst({ where: { itemCode: line.itemCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({ data: { itemCode: line.itemCode, sourceId, transactionType: 'MATERIAL_INDENT', outQty: issue, balance: (prev?.balance || 0) - issue, reference: ref } })
      return applyLineIssue(tx, indent, line, operationalQty)
    })
    return res.json({ success: true, issued: issue, remaining: result.lineRemaining, data: await freshResponse(result.fresh) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Bump the line's issued qty by `addedInLineUom` — the operator-entered
// amount, which is already in the line's own UOM (Operational UOM, same as
// requestedQty), NOT the Inventory-UOM figure that left stock. Accumulating
// the Inventory qty here would compare a KG number against an L requirement
// and leave a fully-issued Methanol line stuck at "Partial" forever.
// Recomputes line + header status. Runs inside the caller's transaction.
async function applyLineIssue(tx, indent, line, addedInLineUom) {
  const newIssued = Number((line.issuedQty + Number(addedInLineUom)).toPrecision(12))
  const updatedLine = { ...line, issuedQty: newIssued }
  await tx.materialIndentItem.update({
    where: { id: line.id },
    data: { issuedQty: newIssued, lineStatus: lineStatusFor(updatedLine) },
  })
  const items = indent.items.map(i => (i.id === line.id ? updatedLine : i))
  const nextStatus = headerStatusFor(items)
  const fresh = await tx.materialIndent.update({
    where: { id: indent.id },
    data: {
      status: nextStatus,
      completedAt: nextStatus === 'COMPLETED' ? new Date() : indent.completedAt,
    },
    include: { items: { orderBy: { createdAt: 'asc' } } },
  })
  return { fresh, lineRemaining: Math.max(0, Number((line.requestedQty - newIssued).toPrecision(12))) }
}

// PATCH /material-indent/:id/reject   body: { reason }
export const rejectIndent = async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim()
    if (reason.length < 3) return res.status(400).json({ success: false, error: 'A reason (min 3 chars) is required', code: 'VALIDATION_ERROR' })

    const indent = await prisma.materialIndent.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    if (!['OPEN', 'PARTIAL'].includes(indent.status))
      return res.status(409).json({ success: false, error: `Cannot reject a ${indent.status.toLowerCase()} indent`, code: 'CONFLICT' })

    const updated = await prisma.$transaction(async (tx) => {
      await tx.materialIndentItem.updateMany({
        where: { indentId: indent.id, lineStatus: { not: 'REJECTED' }, issuedQty: { lte: EPS } },
        data: { lineStatus: 'REJECTED', lineRejectionReason: reason },
      })
      return tx.materialIndent.update({
        where: { id: indent.id },
        data: { status: 'REJECTED', rejectionReason: reason },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
    })
    return res.json({ success: true, data: await freshResponse(updated) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// PATCH /material-indent/:id/items/:itemId/reject   body: { reason }
export const rejectLine = async (req, res) => {
  try {
    const reason = String(req.body.reason || '').trim()
    if (reason.length < 3) return res.status(400).json({ success: false, error: 'A reason (min 3 chars) is required', code: 'VALIDATION_ERROR' })

    const indent = await prisma.materialIndent.findUnique({ where: { id: req.params.id }, include: { items: true } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    if (!['OPEN', 'PARTIAL'].includes(indent.status))
      return res.status(409).json({ success: false, error: `Indent is ${indent.status.toLowerCase()}`, code: 'CONFLICT' })

    const line = indent.items.find(i => i.id === req.params.itemId)
    if (!line) return res.status(404).json({ success: false, error: 'Item not found on this indent', code: 'NOT_FOUND' })
    if (line.lineStatus === 'REJECTED')
      return res.status(409).json({ success: false, error: 'This line is already rejected', code: 'CONFLICT' })

    const updated = await prisma.$transaction(async (tx) => {
      await tx.materialIndentItem.update({
        where: { id: line.id },
        data: { lineStatus: 'REJECTED', lineRejectionReason: reason },
      })
      const items = indent.items.map(i => (i.id === line.id ? { ...i, lineStatus: 'REJECTED' } : i))
      const nextStatus = headerStatusFor(items)
      return tx.materialIndent.update({
        where: { id: indent.id },
        data: {
          status: nextStatus,
          completedAt: nextStatus === 'COMPLETED' ? new Date() : indent.completedAt,
        },
        include: { items: { orderBy: { createdAt: 'asc' } } },
      })
    })
    return res.json({ success: true, data: await freshResponse(updated) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// PATCH /material-indent/:id/cancel   — requester withdraws their own request.
export const cancelIndent = async (req, res) => {
  try {
    const indent = await prisma.materialIndent.findUnique({ where: { id: req.params.id } })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    if (indent.createdBy && indent.createdBy !== req.user?.email)
      return res.status(403).json({ success: false, error: 'You can only cancel your own indents', code: 'FORBIDDEN' })
    if (!['DRAFT', 'OPEN'].includes(indent.status))
      return res.status(409).json({ success: false, error: `Cannot cancel a ${indent.status.toLowerCase()} indent`, code: 'CONFLICT' })

    const updated = await prisma.materialIndent.update({
      where: { id: indent.id },
      data: { status: 'CANCELLED' },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    return res.json({ success: true, data: await freshResponse(updated) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
