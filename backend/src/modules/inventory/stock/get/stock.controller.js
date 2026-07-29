import prisma from '../../../../db.js'
import { flattenPack, packDetailInclude } from '../../../../services/pack-view.js'


const listStock = async (req, res) => {
  const { search } = req.query
  try {
    const rms = await prisma.rmMaster.findMany({
      where: search ? { OR: [
        { itemCode: { contains: search, mode: 'insensitive' } },
        { itemName: { contains: search, mode: 'insensitive' } },
      ]} : {},
      orderBy: { itemName: 'asc' }
    })

    // Bulk-fetch pack/container stock for every RM in 2 queries total instead
    // of 2 queries PER item — the previous per-item Promise.all fired
    // hundreds of concurrent queries (2 per RM) that exhausted the DB
    // connection pool once the RM register grew past a couple hundred items.
    const [packStocks, containers] = await Promise.all([
      prisma.packDetail.groupBy({
        by: ['itemCode'],
        where: { status: 'INWARDED', remainingQty: { gt: 0 } },
        _sum: { remainingQty: true },
        _count: { packId: true },
      }),
      prisma.containerMaster.findMany(),
    ])
    const packStockMap  = new Map(packStocks.map(p => [p.itemCode, p]))
    const containerMap  = new Map(containers.map(c => [c.itemCode, c]))

    const stockData = rms.map((rm) => {
      const packStock = packStockMap.get(rm.itemCode)
      const container = containerMap.get(rm.itemCode)
      return {
        itemCode: rm.itemCode,
        itemName: rm.itemName,
        uom: rm.uom,
        stockInPacks: packStock?._sum.remainingQty || 0,
        activePacks: packStock?._count.packId || 0,
        stockInContainer: container?.currentQty || 0,
        totalStock: (packStock?._sum.remainingQty || 0) + (container?.currentQty || 0),
      }
    })
    return res.json({ success: true, data: stockData })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const listContainers = async (req, res) => {
  try {
    const containers = await prisma.containerMaster.findMany({ orderBy: { itemName: 'asc' } })
    return res.json({ success: true, data: containers })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const getItemStock = async (req, res) => {
  try {
    const rm = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!rm) return res.status(404).json({ success: false, error: 'Item not found', code: 'NOT_FOUND' })
    const packs = await prisma.packDetail.findMany({
      where: { itemCode: rm.itemCode, status: 'INWARDED', remainingQty: { gt: 0 } }
    })
    return res.json({ success: true, data: { rm, packs } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

const getRmHistory = async (req, res) => {
  try {
    const { itemCode } = req.params
    const [rm, bags] = await Promise.all([
      prisma.rmMaster.findUnique({ where: { itemCode } }),
      prisma.packDetail.findMany({
        where: { itemCode }, include: packDetailInclude,
        orderBy: { printMaster: { createdAt: 'desc' } },
      }),
    ])
    if (!rm) return res.status(404).json({ success: false, error: 'Item not found', code: 'NOT_FOUND' })
    const packs = bags.map(flattenPack).map(p => ({ ...p, balanceTotalQty: p.totalQty }))
    return res.json({ success: true, data: { rm, packs } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

function periodStart(period) {
  const now = new Date()
  if (period === 'today') {
    const s = new Date(now); s.setHours(0, 0, 0, 0); return s
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'year')  return new Date(now.getFullYear(), 0, 1)
  return null
}

const getDashboardStats = async (req, res) => {
  try {
    const { period = 'month' } = req.query
    const from = periodStart(period)

    const cAt = from ? { gte: from } : undefined  // createdAt filter
    const cw  = cAt ? { createdAt: cAt } : {}     // where block for createdAt fields

    const [
      // ── Raw Materials ──────────────────────────────────────────────────
      totalRm,
      rmInStock,

      // ── Gate ───────────────────────────────────────────────────────────
      gateInTotal,
      gateInPending,
      gateInApproved,
      gateOutTotal,

      // ── Print Master (packs generated) ─────────────────────────────────
      packsGenerated,
      packsAwaiting,

      // ── Store Inward ───────────────────────────────────────────────────
      inwardCount,

      // ── Store Outward ──────────────────────────────────────────────────
      outwardCount,
      outwardQtyAgg,

      // ── Indents ────────────────────────────────────────────────────────
      indentTotal,
      indentOpen,
      indentClosed,

      // ── Production Batches ─────────────────────────────────────────────
      batchTotal,
      batchCompleted,
      batchInProgress,

      // ── Sales Orders ───────────────────────────────────────────────────
      soTotal,
      soItemPending,
      soItemDispatched,

      // ── Dispatch ───────────────────────────────────────────────────────
      dispatchTotal,
    ] = await Promise.all([
      // Total RM items (all time — master data)
      prisma.rmMaster.count(),

      // Items with stock (current snapshot — no period filter)
      prisma.packDetail.groupBy({
        by: ['itemCode'],
        where: { status: 'INWARDED', remainingQty: { gt: 0 } },
      }).then(r => r.length),

      // Gate inward
      prisma.gateInward.count({ where: cw }),
      prisma.gateInward.count({ where: { status: 'pending', ...cw } }),
      prisma.gateInward.count({ where: { status: { in: ['approved', 'received', 'completed'] }, ...cw } }),

      // Gate outward
      prisma.gateOutward.count({ where: cw }),

      // Packs generated (PackDetail bags — one row per physical pack/label)
      prisma.packDetail.count({ where: cAt ? { printMaster: { createdAt: cAt } } : {} }),
      // Packs awaiting inward (current state)
      prisma.packDetail.count({ where: { status: 'AWAITING_INWARD' } }),

      // Inward transactions
      prisma.packDetail.count({ where: { status: 'INWARDED', ...(cAt ? { inwardedAt: cAt } : {}) } }),

      // Outward transactions
      prisma.outward.count({ where: cAt ? { timestamp: cAt } : {} }),
      prisma.outward.aggregate({
        _sum: { qtyIssued: true },
        where: cAt ? { timestamp: cAt } : {},
      }),

      // Indents
      prisma.indentMaster.count({ where: cw }),
      prisma.indentMaster.count({ where: { status: 'OPEN', ...cw } }),
      prisma.indentMaster.count({ where: { status: 'CLOSED', ...cw } }),

      // Production batches
      prisma.productionBatch.count({ where: cw }),
      prisma.productionBatch.count({ where: { status: 'COMPLETED', ...cw } }),
      prisma.productionBatch.count({ where: { status: { in: ['IN_PROGRESS', 'IN_PROCESS'] }, ...cw } }),

      // Sales orders
      prisma.salesOrder.count({ where: cw }),
      prisma.salesOrderItem.count({ where: { status: 'PENDING', ...cw } }),
      prisma.salesOrderItem.count({ where: { status: 'DISPATCHED', ...cw } }),

      // Dispatches (OrderDispatch model from ErpSalesOrder)
      prisma.orderDispatch.count({ where: cAt ? { createdAt: cAt } : {} }),
    ])

    return res.json({
      success: true,
      period,
      from: from?.toISOString() ?? null,
      data: {
        rawMaterials: {
          totalItems:  totalRm,
          inStock:     rmInStock,
          outOfStock:  totalRm - rmInStock,
        },
        gate: {
          inwardTotal:    gateInTotal,
          inwardPending:  gateInPending,
          inwardApproved: gateInApproved,
          outwardTotal:   gateOutTotal,
        },
        store: {
          packsGenerated:      packsGenerated,
          packsAwaiting:       packsAwaiting,
          packsInwarded:       inwardCount,
          outwardTransactions: outwardCount,
          totalQtyIssued:      Number(outwardQtyAgg._sum?.qtyIssued ?? 0),
        },
        production: {
          totalIndents:       indentTotal,
          openIndents:        indentOpen,
          closedIndents:      indentClosed,
          totalBatches:       batchTotal,
          completedBatches:   batchCompleted,
          inProgressBatches:  batchInProgress,
        },
        salesOrders: {
          total:          soTotal,
          pendingItems:   soItemPending,
          dispatchedItems: soItemDispatched,
        },
        dispatch: {
          total: dispatchTotal,
        },
      },
    })

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}



export {
  listStock,
  listContainers,
  getItemStock,
  getRmHistory,
  getDashboardStats
}
