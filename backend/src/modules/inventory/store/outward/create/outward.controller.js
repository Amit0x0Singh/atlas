import prisma from '../../../../../db.js'
import { packDetailInclude } from '../../../../../services/pack-view.js'
import { resolveIssueQty, toOperationalDisplay } from '../services/uom-conversion.service.js'

// Best-effort inverse conversion for a fully-automatic deduction (no operator
// qty to validate against) — falls back to same-unit display rather than
// blocking an otherwise-valid auto-issue just because a display conversion
// can't be computed (e.g. conversionRequired left false on an old item).
function safeOperationalDisplay(rm, inventoryQty) {
  try {
    return toOperationalDisplay(rm, inventoryQty)
  } catch {
    return { operationalQty: inventoryQty, operationalUom: rm.inventoryUom }
  }
}

const bomScan = async (req, res) => {
  const { indentId, rmCode, packId } = req.body
  if (!indentId || !rmCode || !packId)
    return res.status(400).json({ success: false, error: 'indentId, rmCode, packId required', code: 'VALIDATION_ERROR' })
  try {
    const result = await _issuePack({ indentId, rmCode, packId })
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const bomManual = async (req, res) => {
  const { indentId, rmCode, packId, qtyToIssue } = req.body
  if (!indentId || !rmCode || !packId || !qtyToIssue)
    return res.status(400).json({ success: false, error: 'indentId, rmCode, packId, qtyToIssue required', code: 'VALIDATION_ERROR' })
  try {
    const result = await _issuePack({ indentId, rmCode, packId, forcedQty: parseFloat(qtyToIssue) })
    return res.json(result)
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const packReduction = async (req, res) => {
  const { packId, qty } = req.body
  if (!packId || !qty) return res.status(400).json({ success: false, error: 'packId and qty required', code: 'VALIDATION_ERROR' })
  try {
    const pack = await prisma.packDetail.findUnique({ where: { packId }, include: packDetailInclude })
    if (!pack || pack.status !== 'INWARDED') return res.status(404).json({ success: false, error: 'Pack not found', code: 'NOT_FOUND' })
    const deduct = parseFloat(qty)
    if (deduct > pack.remainingQty)
      return res.status(400).json({ success: false, error: 'Qty exceeds pack balance', code: 'VALIDATION_ERROR' })
    const itemCode = pack.itemCode
    const itemName = pack.printMaster.itemName
    const uom = pack.printMaster.uom
    const containerId = `${itemName.replace(/[^a-zA-Z0-9]/g,'').slice(0,3).toUpperCase()}-${itemCode}-CONT001`
    await prisma.$transaction(async (tx) => {
      await tx.packDetail.update({ where: { packId }, data: { remainingQty: pack.remainingQty - deduct } })
      await tx.containerMaster.upsert({
        where: { itemCode },
        create: { containerId, itemCode, itemName, capacity: 10000, currentQty: deduct, uom },
        update: { currentQty: { increment: deduct } }
      })
      await tx.outward.create({ data: { sourceId: packId, sourceType: 'PACK_REDUCTION', rmCode: itemCode, qtyIssued: deduct } })
      const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({ data: { itemCode, sourceId: containerId, transactionType: 'PACK_TO_CONTAINER', inQty: deduct, balance: (prevLedger?.balance || 0), reference: `Pack ${packId} → Container` } })
    })
    return res.json({ success: true, deducted: deduct, containerId })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const bagLossAdjustment = async (req, res) => {
  const { packId, lossQty, reason } = req.body
  if (!packId || !lossQty || !reason || reason.trim().length < 3)
    return res.status(400).json({ success: false, error: 'packId, lossQty, and reason (min 3 chars) required', code: 'VALIDATION_ERROR' })
  try {
    const entered = parseFloat(lossQty)
    if (isNaN(entered) || entered <= 0)
      return res.status(400).json({ success: false, error: 'lossQty must be a positive number', code: 'VALIDATION_ERROR' })

    const pack = await prisma.packDetail.findUnique({ where: { packId } })
    if (!pack || pack.status !== 'INWARDED') return res.status(404).json({ success: false, error: 'Pack not found or not inwarded', code: 'NOT_FOUND' })

    // The store person weighs/measures the loss in the item's Operational UOM
    // (e.g. spilled 2 L of an oil stocked in KG) — convert to Inventory UOM
    // server-side, same authority as directIssue/bomDirectIssue, before
    // checking against and deducting the pack balance.
    let rm, loss, operationalQty, operationalUom
    try {
      ({ rm, inventoryQty: loss, operationalQty, operationalUom } = await resolveIssueQty(pack.itemCode, entered))
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
    }
    if (loss > pack.remainingQty)
      return res.status(400).json({ success: false, error: `Loss (${loss}) exceeds remaining qty (${pack.remainingQty})` , code: 'VALIDATION_ERROR' })

    const newRemaining = pack.remainingQty - loss
    // Not stored — EXHAUSTED/PARTIALLY_ISSUED are derived from remainingQty
    // wherever packs are listed (see pack-view.js), never written back.
    const newStatus = newRemaining <= 0 ? 'EXHAUSTED' : 'PARTIALLY_ISSUED'

    await prisma.$transaction(async (tx) => {
      await tx.packDetail.update({ where: { packId }, data: { remainingQty: newRemaining } })
      await tx.outward.create({
        data: { sourceId: packId, sourceType: 'STOCK_ADJUSTMENT', rmCode: pack.itemCode, qtyIssued: loss, operationalQty, operationalUom, remarks: reason.trim() }
      })
      const prev = await tx.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({
        data: {
          itemCode: pack.itemCode, sourceId: packId, transactionType: 'STOCK_RECON',
          outQty: loss, balance: (prev?.balance || 0) - loss, reference: `Loss: ${reason.trim()}`
        }
      })
    })

    // lossDeducted/newRemaining are Inventory UOM (what stock is tracked in);
    // operationalQty/operationalUom echo back what the operator actually
    // entered, so the UI can show both sides of a converted adjustment.
    return res.json({
      success: true, packId, lossDeducted: loss, newRemaining, newStatus,
      operationalQty, operationalUom, inventoryUom: rm.inventoryUom,
    })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const stockAdjustment = async (req, res) => {
  const { itemCode, adjustmentQty, remarks } = req.body
  if (!itemCode || adjustmentQty === undefined || !remarks || remarks.length < 5)
    return res.status(400).json({ success: false, error: 'itemCode, adjustmentQty, and remarks (min 5 chars) required', code: 'VALIDATION_ERROR' })
  try {
    const adj = parseFloat(adjustmentQty)
    const prevLedger = await prisma.stockLedger.findFirst({ where: { itemCode }, orderBy: { timestamp: 'desc' } })
    const newBal = (prevLedger?.balance || 0) + adj
    await prisma.stockLedger.create({
      data: {
        itemCode, sourceId: `ADJ-${Date.now()}`, transactionType: 'STOCK_RECON',
        inQty: adj > 0 ? adj : 0, outQty: adj < 0 ? Math.abs(adj) : 0,
        balance: newBal, reference: remarks
      }
    })
    return res.json({ success: true, newBalance: newBal })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const warehouseTransfer = async (req, res) => {
  const { packId, fromWarehouse, toWarehouse, remarks } = req.body
  if (!packId || !toWarehouse)
    return res.status(400).json({ success: false, error: 'packId and toWarehouse required', code: 'VALIDATION_ERROR' })
  try {
    const pack = await prisma.packDetail.findUnique({ where: { packId } })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found', code: 'NOT_FOUND' })
    if (pack.status !== 'INWARDED' || pack.remainingQty <= 0)
      return res.status(400).json({ success: false, error: 'Pack is exhausted or not inwarded', code: 'VALIDATION_ERROR' })
    await prisma.packDetail.update({ where: { packId }, data: { warehouse: toWarehouse } })
    const prevLedger = await prisma.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
    await prisma.stockLedger.create({
      data: {
        itemCode: pack.itemCode, sourceId: packId, transactionType: 'WAREHOUSE_TRANSFER',
        inQty: 0, outQty: 0, balance: prevLedger?.balance || 0,
        reference: `${fromWarehouse || 'Warehouse'} → ${toWarehouse} | Pack: ${packId}${remarks ? ' | ' + remarks : ''}`
      }
    })
    return res.json({ success: true, message: `Pack ${packId} transferred to ${toWarehouse}` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const directIssue = async (req, res) => {
  const { packId, qty, plant, remarks } = req.body
  if (!packId || !qty || !plant)
    return res.status(400).json({ success: false, error: 'packId, qty, plant required', code: 'VALIDATION_ERROR' })
  try {
    const pack = await prisma.packDetail.findUnique({ where: { packId } })
    if (!pack || pack.status !== 'INWARDED') return res.status(404).json({ success: false, error: 'Pack not found or not inwarded', code: 'NOT_FOUND' })
    const entered = parseFloat(qty)
    if (entered <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive', code: 'VALIDATION_ERROR' })

    // entered is in the item's Operational UOM — convert to Inventory UOM
    // (server-authoritative) before checking/deducting the pack balance.
    let issue, operationalQty, operationalUom
    try {
      ({ inventoryQty: issue, operationalQty, operationalUom } = await resolveIssueQty(pack.itemCode, entered))
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
    }
    if (issue > pack.remainingQty)
      return res.status(400).json({ success: false, error: `Qty exceeds pack balance (${pack.remainingQty})` , code: 'VALIDATION_ERROR' })
    await prisma.$transaction(async (tx) => {
      await tx.packDetail.update({ where: { packId }, data: { remainingQty: pack.remainingQty - issue } })
      await tx.outward.create({
        data: { sourceId: packId, sourceType: 'DIRECT_ISSUE', rmCode: pack.itemCode, qtyIssued: issue, operationalQty, operationalUom, remarks: `To: ${plant}${remarks ? ' | ' + remarks : ''}` }
      })
      const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode: pack.itemCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({
        data: {
          itemCode: pack.itemCode, sourceId: packId, transactionType: 'DIRECT_ISSUE',
          inQty: 0, outQty: issue, balance: (prevLedger?.balance || 0) - issue,
          reference: `Direct issue to ${plant}`
        }
      })
    })
    return res.json({ success: true, issued: issue, remainingQty: pack.remainingQty - issue })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const bomDirectIssue = async (req, res) => {
  const { source, sourceId, qty, rmCode, productCode, productName, batchSize, batchRef } = req.body
  if (!source || !sourceId || !qty || !rmCode)
    return res.status(400).json({ success: false, error: 'source, sourceId, qty, rmCode required', code: 'VALIDATION_ERROR' })
  if (!['pack', 'container'].includes(source))
    return res.status(400).json({ success: false, error: 'source must be "pack" or "container"', code: 'VALIDATION_ERROR' })
  try {
    const entered = parseFloat(qty)
    if (entered <= 0) return res.status(400).json({ success: false, error: 'Qty must be positive', code: 'VALIDATION_ERROR' })
    const ref = `BOM: ${productName || productCode || ''}${batchSize ? ' | Batch: ' + batchSize + ' kg' : ''}${batchRef ? ' | Ref: ' + batchRef : ''}`

    // entered is in the item's Operational UOM — convert to Inventory UOM
    // (server-authoritative) before checking/deducting the pack/container.
    let issue, operationalQty, operationalUom
    try {
      ({ inventoryQty: issue, operationalQty, operationalUom } = await resolveIssueQty(rmCode, entered))
    } catch (e) {
      return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
    }

    if (source === 'pack') {
      const pack = await prisma.packDetail.findUnique({ where: { packId: sourceId } })
      if (!pack || pack.status !== 'INWARDED') return res.status(404).json({ success: false, error: 'Pack not found or not inwarded', code: 'NOT_FOUND' })
      if (pack.itemCode !== rmCode)
        return res.status(400).json({ success: false, error: `Pack item code (${pack.itemCode}) does not match RM (${rmCode})` , code: 'VALIDATION_ERROR' })
      if (issue > pack.remainingQty)
        return res.status(400).json({ success: false, error: `Qty (${issue}) exceeds pack balance (${pack.remainingQty})` , code: 'VALIDATION_ERROR' })

      await prisma.$transaction(async (tx) => {
        await tx.packDetail.update({ where: { packId: sourceId }, data: { remainingQty: pack.remainingQty - issue } })
        await tx.outward.create({ data: { sourceId, sourceType: 'BOM_ISSUANCE', rmCode, qtyIssued: issue, operationalQty, operationalUom, remarks: ref } })
        const prev = await tx.stockLedger.findFirst({ where: { itemCode: rmCode }, orderBy: { timestamp: 'desc' } })
        await tx.stockLedger.create({ data: { itemCode: rmCode, sourceId, transactionType: 'BOM_ISSUANCE', outQty: issue, balance: (prev?.balance || 0) - issue, reference: ref } })
      })
      return res.json({ success: true, issued: issue, remaining: pack.remainingQty - issue })
    }

    // source === 'container'
    const container = await prisma.containerMaster.findUnique({ where: { containerId: sourceId } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })
    if (container.itemCode !== rmCode)
      return res.status(400).json({ success: false, error: `Container item code (${container.itemCode}) does not match RM (${rmCode})` , code: 'VALIDATION_ERROR' })
    if (issue > container.currentQty)
      return res.status(400).json({ success: false, error: `Qty (${issue}) exceeds container balance (${container.currentQty})` , code: 'VALIDATION_ERROR' })

    await prisma.$transaction(async (tx) => {
      await tx.containerMaster.update({ where: { containerId: sourceId }, data: { currentQty: { decrement: issue } } })
      await tx.outward.create({ data: { sourceId, sourceType: 'BOM_ISSUANCE', rmCode, qtyIssued: issue, operationalQty, operationalUom, remarks: ref } })
      const prev = await tx.stockLedger.findFirst({ where: { itemCode: rmCode }, orderBy: { timestamp: 'desc' } })
      await tx.stockLedger.create({ data: { itemCode: rmCode, sourceId, transactionType: 'BOM_ISSUANCE', outQty: issue, balance: (prev?.balance || 0) - issue, reference: ref } })
    })
    return res.json({ success: true, issued: issue, remaining: container.currentQty - issue })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ─── BOM issuance session (in-progress checklist state) ─────────────────────
const upsertBomSession = async (req, res) => {
  const { id } = req.params
  const { planTaskId, productCode, productName, batchQty, batchUom, batchRef, diNo, bomLines } = req.body
  if (!id || !productName || batchQty === undefined || !bomLines)
    return res.status(400).json({ success: false, error: 'id, productName, batchQty, bomLines required', code: 'VALIDATION_ERROR' })
  try {
    const data = {
      productCode: productCode || null,
      productName,
      batchQty:    parseFloat(batchQty),
      batchUom:    batchUom || 'KG',
      batchRef:    batchRef || null,
      diNo:        diNo || null,
      bomLines,
    }
    const session = await prisma.bomIssueSession.upsert({
      where:  { id },
      create: { id, planTaskId: planTaskId || null, ...data },
      update: data,
    })
    return res.json({ success: true, data: session })
  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const deleteBomSession = async (req, res) => {
  try {
    await prisma.bomIssueSession.delete({ where: { id: req.params.id } })
    return res.json({ success: true })
  } catch (e) {
    // Already deleted / never existed — treat as success, the caller's intent (gone) is satisfied
    return res.json({ success: true })
  }
}

const _issuePack = async ({ indentId, rmCode, packId, forcedQty }) => {
  const detail = await prisma.indentDetails.findFirst({ where: { indentId, rmCode } })
  if (!detail) throw new Error('RM not found in indent')
  if (detail.balanceQty <= 0) throw new Error('RM already fully issued')

  const pack = await prisma.packDetail.findUnique({ where: { packId } })
  if (!pack || pack.status !== 'INWARDED') throw new Error('Pack not inwarded or not found')
  if (pack.remainingQty <= 0) throw new Error('Pack exhausted (no remaining qty)')
  if (pack.itemCode !== rmCode) throw new Error(`Pack item code (${pack.itemCode}) does not match RM (${rmCode})`)

  // forcedQty (bomManual) is operator-entered in the item's Operational UOM —
  // convert to Inventory UOM (server-authoritative) before clamping against
  // the inventory-uom balances below. bomScan has no operator input at all;
  // the deduct amount is already inventory-uom, dictated purely by stock.
  let rm, deduct
  if (forcedQty !== undefined) {
    const resolved = await resolveIssueQty(rmCode, forcedQty)
    rm = resolved.rm
    deduct = Math.min(resolved.inventoryQty, pack.remainingQty, detail.balanceQty)
  } else {
    rm = await prisma.rmMaster.findUnique({ where: { itemCode: rmCode } })
    deduct = Math.min(pack.remainingQty, detail.balanceQty)
  }

  if (deduct <= 0) throw new Error('Nothing to deduct')

  // What actually got deducted (post-clamp) converted back to Operational
  // UOM for the transaction record — reflects a partial fulfillment
  // accurately even when less than the operator's requested qty was issued.
  const { operationalQty, operationalUom } = safeOperationalDisplay(rm, deduct)

  await prisma.$transaction(async (tx) => {
    await tx.packDetail.update({ where: { packId }, data: { remainingQty: pack.remainingQty - deduct } })
    await tx.indentDetails.update({
      where: { id: detail.id },
      data: { issuedQty: detail.issuedQty + deduct, balanceQty: detail.balanceQty - deduct }
    })
    await tx.outward.create({ data: { indentId, sourceId: packId, sourceType: 'BOM_ISSUANCE', rmCode, qtyIssued: deduct, operationalQty, operationalUom } })
    const prevLedger = await tx.stockLedger.findFirst({ where: { itemCode: rmCode }, orderBy: { timestamp: 'desc' } })
    const newBal = (prevLedger?.balance || 0) - deduct
    await tx.stockLedger.create({ data: { itemCode: rmCode, sourceId: packId, transactionType: 'BOM_ISSUANCE', outQty: deduct, balance: newBal, reference: `Indent ${indentId}` } })

    const allDetails = await tx.indentDetails.findMany({ where: { indentId } })
    const allDone = allDetails.every(d => d.balanceQty <= 0 || (d.rmCode === rmCode && detail.balanceQty - deduct <= 0))
    if (allDone) {
      const indent = await tx.indentMaster.update({ where: { indentId }, data: { status: 'CLOSED' } })
      await tx.sfgMaster.updateMany({
        where: { indentId, formulatedQty: 0 },
        data: { formulatedQty: indent.batchSize, sfgQty: indent.batchSize, status: 'PARTIAL' }
      })
    }
  })

  return { success: true, deducted: deduct, remaining: detail.balanceQty - deduct }
}


export {
  bomScan,
  bomManual,
  packReduction,
  bagLossAdjustment,
  stockAdjustment,
  warehouseTransfer,
  directIssue,
  bomDirectIssue,
  upsertBomSession,
  deleteBomSession
}
