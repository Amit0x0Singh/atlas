import prisma from '../../../../db.js'
import { flattenPack, packDetailInclude } from '../../../../services/pack-view.js'
import { TRANSACTION_TYPES, TRANSACTION_TYPE_VALUES } from '../../../../utils/ledger-transaction-types.js'

// BOM_ISSUANCE ledger rows record the deduction in Inventory UOM only
// (outQty) — the Operational UOM qty the operator actually entered lives on
// the matching Outward row instead, so the ledger list has to join it to
// show the same "3.333 l (1.000 deducted)" framing Store Outward's Recent
// Transactions already uses (see outward.controller.js's bomDirectIssue).
// There's no FK between the two tables, and the same pack can legitimately
// be issued more than once for the same BOM (sourceId + rmCode repeats) —
// so candidates are matched by closest timestamp rather than a plain
// findFirst, which would silently pick an arbitrary row once duplicates
// exist.
async function attachOperationalQty(rows) {
  const bomRows = rows.filter((r) => r.transactionType === 'BOM_ISSUANCE')
  if (bomRows.length === 0) return rows
  const sourceIds = [...new Set(bomRows.map((r) => r.sourceId))]
  const itemCodes = [...new Set(bomRows.map((r) => r.itemCode))]
  const candidates = await prisma.outward.findMany({
    where: { sourceId: { in: sourceIds }, rmCode: { in: itemCodes } },
    select: { sourceId: true, rmCode: true, qtyIssued: true, operationalQty: true, operationalUom: true, timestamp: true },
  })
  const byKey = new Map()
  for (const c of candidates) {
    const key = `${c.rmCode}::${c.sourceId}`
    if (!byKey.has(key)) byKey.set(key, [])
    byKey.get(key).push(c)
  }
  return rows.map((r) => {
    if (r.transactionType !== 'BOM_ISSUANCE') return r
    const pool = byKey.get(`${r.itemCode}::${r.sourceId}`)
    if (!pool?.length) return r
    const best = pool.reduce((a, b) =>
      Math.abs(new Date(b.timestamp) - new Date(r.timestamp)) < Math.abs(new Date(a.timestamp) - new Date(r.timestamp)) ? b : a
    )
    return { ...r, operationalQty: best.operationalQty, operationalUom: best.operationalUom }
  })
}

export const listLedger = async (req, res) => {
  try {
    const {
      itemCode, search, transactionType, fromDate, toDate,
      reference, warehouse, direction, limit = 50, page = 1,
    } = req.query

    const where = {}
    if (itemCode) where.itemCode = itemCode
    if (transactionType && TRANSACTION_TYPE_VALUES.has(transactionType)) where.transactionType = transactionType
    if (reference?.trim()) where.reference = { contains: reference.trim(), mode: 'insensitive' }
    if (direction === 'IN')  where.inQty  = { gt: 0 }
    if (direction === 'OUT') where.outQty = { gt: 0 }
    if (fromDate?.trim() || toDate?.trim()) {
      where.timestamp = {}
      if (fromDate?.trim()) where.timestamp.gte = new Date(fromDate)
      if (toDate?.trim())  where.timestamp.lte = new Date(`${toDate}T23:59:59.999Z`)
    }

    // itemCode isn't a formal FK to RmMaster (plain string column), so a
    // name/code search has to resolve matching item codes first — same
    // heuristic-join-by-shared-key pattern attachOperationalQty() below
    // already uses against Outward. An explicit `itemCode` (exact) wins if
    // both are somehow present.
    if (search?.trim() && !itemCode) {
      const q = search.trim()
      const matches = await prisma.rmMaster.findMany({
        where: { OR: [{ itemCode: { contains: q, mode: 'insensitive' } }, { itemName: { contains: q, mode: 'insensitive' } }] },
        select: { itemCode: true },
      })
      where.itemCode = { in: matches.map(m => m.itemCode) }
    }

    // StockLedger has no warehouse column — only pack-backed transactions
    // (INWARD/BOM_ISSUANCE/PACK_TO_CONTAINER/WAREHOUSE_TRANSFER/DIRECT_ISSUE/
    // some STOCK_RECON rows) trace back to a PackDetail.warehouse via
    // sourceId. Container-sourced rows (CONTAINER_ISSUE, synthetic
    // `ADJ-...` stock-adjustment sourceIds) simply won't match any pack and
    // are correctly excluded when this filter is active.
    if (warehouse?.trim()) {
      // PackDetail.warehouse is stored lowercase (field-normalization-rules.js)
      // while the WAREHOUSE option group's codes are uppercase — compare
      // case-insensitively so the filter dropdown's value always matches.
      const packs = await prisma.packDetail.findMany({ where: { warehouse: { equals: warehouse.trim(), mode: 'insensitive' } }, select: { packId: true } })
      where.sourceId = { in: packs.map(p => p.packId) }
    }

    const [total, rows] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])
    // Enrich with item names + Inventory UOM (the ledger's own qty columns
    // are always in Inventory UOM — shown bare with no unit today).
    const codes   = [...new Set(rows.map(r => r.itemCode).filter(Boolean))]
    const rmItems = await prisma.rmMaster.findMany({ where: { itemCode: { in: codes } }, select: { itemCode: true, itemName: true, inventoryUom: true } })
    const rmMap   = Object.fromEntries(rmItems.map(r => [r.itemCode, r]))
    const withUom = rows.map(r => ({ ...r, itemName: rmMap[r.itemCode]?.itemName || r.itemCode, uom: rmMap[r.itemCode]?.inventoryUom || '' }))
    const data    = await attachOperationalQty(withUom)
    return res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Powers the Transaction Type filter dropdown — served from the same
// constants file the ledger's own `transactionType` validation uses, so the
// UI can never offer a value the backend doesn't actually produce.
export const getLedgerMeta = async (req, res) => {
  return res.json({ success: true, data: { transactionTypes: TRANSACTION_TYPES } })
}

export const getLedgerByItem = async (req, res) => {
  try {
    const { limit = 50, page = 1 } = req.query
    const where = { itemCode: req.params.itemCode }
    const [total, rows] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])
    return res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

async function findFlatPack(packId) {
  const bag = await prisma.packDetail.findUnique({ where: { packId }, include: packDetailInclude }).catch(() => null)
  return bag ? flattenPack(bag) : null
}

export const getLedgerEntry = async (req, res) => {
  try {
    const entry = await prisma.stockLedger.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ success: false, error: 'Entry not found', code: 'NOT_FOUND' })

    const detail = {}
    if (entry.transactionType === 'BOM_ISSUANCE') {
      // The same pack can be issued more than once against the same BOM
      // (sourceId + rmCode repeats) — findFirst would arbitrarily grab
      // whichever Outward row Postgres happens to return, potentially
      // showing the wrong issuance's Operational UOM qty. Ledger + Outward
      // rows are written in the same transaction (see bomDirectIssue), so
      // their timestamps are only milliseconds apart — closest wins.
      const candidates = await prisma.outward.findMany({ where: { sourceId: entry.sourceId, rmCode: entry.itemCode } })
      const outward = candidates.length <= 1
        ? candidates[0]
        : candidates.reduce((a, b) =>
            Math.abs(new Date(b.timestamp) - new Date(entry.timestamp)) < Math.abs(new Date(a.timestamp) - new Date(entry.timestamp)) ? b : a
          )
      detail.outward = outward
      if (outward?.indentId) {
        detail.indent = await prisma.indentMaster.findUnique({ where: { indentId: outward.indentId }, include: { details: true } })
        detail.sfg = await prisma.sfgMaster.findFirst({ where: { indentId: outward.indentId } })
      }
      detail.pack = await findFlatPack(entry.sourceId)
    }
    if (entry.transactionType === 'INWARD') {
      const flat = await findFlatPack(entry.sourceId)
      detail.pack = flat
      detail.inward = flat && {
        packId: flat.packId, itemCode: flat.itemCode, itemName: flat.itemName,
        lotNo: flat.lotNo, bagNo: flat.bagNo, qty: flat.totalQty,
        inwardTime: flat.inwardedAt, warehouse: flat.warehouse,
      }
    }
    if (entry.transactionType === 'PACK_TO_CONTAINER') {
      detail.pack = await findFlatPack(entry.sourceId)
    }
    return res.json({ success: true, data: { ...entry, detail } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
