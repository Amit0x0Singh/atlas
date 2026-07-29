import prisma from '../../../../db.js'


// List all GRNs — one row per Gate Inward entry with linked Print Master
// headers. Grouped by the gateInwardId FK now, instead of matching on
// invoiceNo + supplier strings.
const listGrn = async (req, res) => {

  try {
    const headers = await prisma.printMaster.findMany({
      include: { gateInward: true, bags: { select: { packId: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const groups = new Map()

    for (const h of headers) {
      const gi = h.gateInward
      if (!groups.has(gi.inwardId)) {
        groups.set(gi.inwardId, {
          gateInwardId: gi.inwardId,
          invoiceNo: gi.invoiceNo || '—',
          supplier: gi.supplierName,
          company: gi.companyName,
          receivedDate: gi.entryTime,
          totalPacks: 0,
          totalQty: 0,
          items: new Set(),
          createdAt: h.createdAt,
        })
      }

      const g = groups.get(gi.inwardId)
      g.totalPacks += h.bags.length
      g.totalQty += Number(h.packQty) * h.bags.length
      g.items.add(h.itemName)
      if (h.createdAt > g.createdAt) g.createdAt = h.createdAt
    }

    const result = [...groups.values()].map(g => ({
      ...g, items: [...g.items], uniqueItems: g.items.size,
    }))

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return res.json({ success: true, data: result })

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


/// Get GRN detail for a specific Gate Inward entry
const getGrnDetail = async (req, res) => {
  const { gateInwardId } = req.query

  try {
    if (!gateInwardId)
      return res.status(400).json({ success: false, error: 'gateInwardId required', code: 'VALIDATION_ERROR' })

    const gateInward = await prisma.gateInward.findUnique({ where: { inwardId: gateInwardId } })
    if (!gateInward)
      return res.status(404).json({ success: false, error: 'Gate Inward entry not found', code: 'NOT_FOUND' })

    const headers = await prisma.printMaster.findMany({
      where: { gateInwardId },
      include: { bags: true },
      orderBy: { itemCode: 'asc' },
    })

    if (headers.length === 0)
      return res.status(404).json({ success: false, error: 'No packs found for this Gate Inward entry', code: 'NOT_FOUND' })

    const items = headers.map(h => ({
      itemCode: h.itemCode, itemName: h.itemName, uom: h.uom,
      totalBags: h.bags.length, packQty: Number(h.packQty),
      totalQty: h.bags.length * Number(h.packQty),
      lotNo: h.lotNo, receivedDate: gateInward.entryTime,
    }))

    const allPacks = headers.flatMap(h => h.bags.map(b => ({
      packId: b.packId, itemCode: h.itemCode, itemName: h.itemName, lotNo: h.lotNo,
      bagNo: b.bagNo, packQty: h.packQty, uom: h.uom, status: b.status,
    })))

    return res.json({
      success: true,
      data: {
        gateInwardId, invoiceNo: gateInward.invoiceNo || '—', supplier: gateInward.supplierName,
        company: gateInward.companyName || null, receivedDate: gateInward.entryTime,
        items, allPacks,
        totalPacks: allPacks.length, totalQty: items.reduce((s, i) => s + i.totalQty, 0),
      }
    })

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


export { listGrn, getGrnDetail }
