import prisma from '../../../db.js'

export async function listLedger(req, res) {
  try {
    const { itemCode, limit = 50, page = 1 } = req.query
    const where = itemCode ? { itemCode } : {}
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getLedgerByItem(req, res) {
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
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getLedgerEntry(req, res) {
  try {
    const entry = await prisma.stockLedger.findUnique({ where: { id: req.params.id } })
    if (!entry) return res.status(404).json({ success: false, error: 'Entry not found' })

    const detail = {}
    if (entry.transactionType === 'BOM_ISSUANCE') {
      const outward = await prisma.outward.findFirst({ where: { sourceId: entry.sourceId, rmCode: entry.itemCode } })
      detail.outward = outward
      if (outward?.indentId) {
        detail.indent = await prisma.indentMaster.findUnique({ where: { indentId: outward.indentId }, include: { details: true } })
        detail.sfg = await prisma.sfgMaster.findFirst({ where: { indentId: outward.indentId } })
      }
      detail.pack = await prisma.printMaster.findUnique({ where: { packId: entry.sourceId } }).catch(() => null)
    }
    if (entry.transactionType === 'INWARD') {
      detail.pack = await prisma.printMaster.findUnique({ where: { packId: entry.sourceId } }).catch(() => null)
      detail.inward = await prisma.inward.findFirst({ where: { packId: entry.sourceId } })
    }
    if (entry.transactionType === 'PACK_TO_CONTAINER') {
      detail.pack = await prisma.printMaster.findUnique({ where: { packId: entry.sourceId } }).catch(() => null)
    }
    return res.json({ success: true, data: { ...entry, detail } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
