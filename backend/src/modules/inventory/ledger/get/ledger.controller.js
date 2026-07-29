import prisma from '../../../../db.js'
import { flattenPack, packDetailInclude } from '../../../../services/pack-view.js'

export const listLedger = async (req, res) => {
  try {
    const { itemCode, limit = 50, page = 1 } = req.query
    const where = itemCode !== undefined ? { itemCode } : {}
    const [total, rows] = await Promise.all([
      prisma.stockLedger.count({ where }),
      prisma.stockLedger.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit)
      })
    ])
    // Enrich with item names
    const codes   = [...new Set(rows.map(r => r.itemCode).filter(Boolean))]
    const rmItems = await prisma.rmMaster.findMany({ where: { itemCode: { in: codes } }, select: { itemCode: true, itemName: true } })
    const rmMap   = Object.fromEntries(rmItems.map(r => [r.itemCode, r.itemName]))
    const data    = rows.map(r => ({ ...r, itemName: rmMap[r.itemCode] || r.itemCode }))
    return res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
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
      const outward = await prisma.outward.findFirst({ where: { sourceId: entry.sourceId, rmCode: entry.itemCode } })
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
