import prisma from '../db.js'

// ── Sequence helper ───────────────────────────────────────────────────────────
async function nextPlanId() {
  const year = new Date().getFullYear()
  const seq  = await prisma.planSequence.upsert({
    where:  { year },
    create: { year, seq: 1 },
    update: { seq: { increment: 1 } },
  })
  return `PP-${year}-${String(seq.seq).padStart(4, '0')}`
}

// ── RM availability check ─────────────────────────────────────────────────────
// Returns { status: 'GREEN'|'AMBER'|'RED', details: [...] }
async function checkRmAvailability(productCode, batchQtyKg) {
  const recipe = await prisma.recipeDb.findMany({ where: { productCode } })
  if (!recipe.length) return { status: 'AMBER', details: [], note: 'No BOM found' }

  const details = []
  let worstStatus = 'GREEN'

  for (const row of recipe) {
    const required = row.qtyPerUnit * batchQtyKg

    // Sum available stock from StockLedger balance
    const ledgerRows = await prisma.stockLedger.findMany({
      where: { itemCode: row.rmCode },
      orderBy: { timestamp: 'desc' },
      take: 1,
    })
    const available = ledgerRows[0]?.balance ?? 0

    let status = 'GREEN'
    if (available <= 0)            { status = 'RED';   worstStatus = 'RED' }
    else if (available < required) { status = 'AMBER'; if (worstStatus !== 'RED') worstStatus = 'AMBER' }

    details.push({
      rmCode: row.rmCode, rmName: row.rmName,
      required: +required.toFixed(3), available: +available.toFixed(3),
      uom: row.uom, roleType: row.roleType, status,
    })
  }
  return { status: worstStatus, details }
}

// ── Equipment availability check ──────────────────────────────────────────────
async function checkEquipmentAvailability(equipName, plannedDate) {
  if (!equipName) return 'UNKNOWN'
  const dateStr = new Date(plannedDate).toISOString().split('T')[0]
  const conflicting = await prisma.productionPlan.count({
    where: {
      equipment: equipName,
      status:    { notIn: ['CANCELLED', 'COMPLETED'] },
      plannedDate: {
        gte: new Date(dateStr + 'T00:00:00.000Z'),
        lte: new Date(dateStr + 'T23:59:59.999Z'),
      }
    }
  })
  return conflicting > 0 ? 'BUSY' : 'AVAILABLE'
}

// ── Core planning engine ──────────────────────────────────────────────────────
export async function runPlanningEngine(trigger = 'MANUAL') {
  const today = new Date()

  // Fetch all PENDING sales order items, sorted by priority + ETD
  const PRIORITY_ORDER = { VERY_URGENT: 0, URGENT: 1, MODERATE: 2 }
  const pendingItems = await prisma.salesOrderItem.findMany({
    where: { status: 'PENDING' },
    include: {
      salesOrder: {
        select: { id: true, diNo: true, customerName: true, priority: true,
                  estimatedDispatchDate: true, company: true }
      }
    }
  })

  // Sort by priority then ETD
  pendingItems.sort((a, b) => {
    const pa = PRIORITY_ORDER[a.salesOrder.priority] ?? 2
    const pb = PRIORITY_ORDER[b.salesOrder.priority] ?? 2
    if (pa !== pb) return pa - pb
    return new Date(a.salesOrder.estimatedDispatchDate) - new Date(b.salesOrder.estimatedDispatchDate)
  })

  let plansCreated = 0
  const errors     = []

  for (const item of pendingItems) {
    try {
      // Check if a plan already exists for this item
      const existing = await prisma.productionPlan.findFirst({
        where: { salesOrderItemId: item.id, status: { notIn: ['CANCELLED'] } }
      })
      if (existing) continue // Already planned

      const so = item.salesOrder

      // Determine planned date (ETD minus 3 days buffer, but not before tomorrow)
      const etd        = new Date(so.estimatedDispatchDate)
      const planTarget = new Date(etd)
      planTarget.setDate(planTarget.getDate() - 3)
      const tomorrow   = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const plannedDate = planTarget > tomorrow ? planTarget : tomorrow

      // Resolve product code — use saved code, or look up by name in ProductMaster
      let productCode = item.inhouseProductCode || null
      if (!productCode && item.inhouseProductName) {
        const pm = await prisma.productMaster.findFirst({
          where: { productName: { equals: item.inhouseProductName, mode: 'insensitive' } },
          select: { productCode: true },
        })
        if (pm) productCode = pm.productCode
      }

      // RM check
      const rmCheck = productCode
        ? await checkRmAvailability(productCode, item.totalQty)
        : { status: 'AMBER', details: [], note: 'No product code linked' }

      // Equipment check (use equipment from item's section if available)
      const eqpStatus = 'UNKNOWN' // Will be filled by team during review

      const planId = await nextPlanId()

      await prisma.$transaction(async (tx) => {
        // Create the plan
        await tx.productionPlan.create({
          data: {
            planId,
            salesOrderId:     so.id,
            salesOrderItemId: item.id,
            diNo:             so.diNo,
            customerName:     so.customerName,
            sectionType:      item.sectionName || 'POWDER',
            plannedDate,
            productCode:      productCode,
            productName:      item.inhouseProductName,
            totalQty:         item.totalQty,
            uom:              item.totalUom || 'KG',
            carrier:          item.carrier || null,
            specs:            item.activeSpecs || null,
            unitPackQty:      item.unitQty || null,
            noOfUnits:        item.totalCS || null,
            labels:           item.labelType || null,
            rmCheckStatus:    rmCheck.status,
            eqpCheckStatus:   eqpStatus,
            rmCheckDetails:   rmCheck.details,
            autoGenerated:    trigger === 'SCHEDULED',
            status:           'DRAFT',
          }
        })

        // Update sales order item to PLANNED
        await tx.salesOrderItem.update({
          where: { id: item.id },
          data:  { status: 'PLANNED' }
        })
      })

      plansCreated++
    } catch (err) {
      errors.push(`Item ${item.id}: ${err.message}`)
    }
  }

  // Log the run
  await prisma.plannerLog.create({
    data: {
      trigger, plansCreated,
      ordersProcessed: pendingItems.length,
      errors: errors.length ? errors.join(' | ') : null,
    }
  })

  return { plansCreated, ordersProcessed: pendingItems.length, errors }
}

// ── Route handlers ────────────────────────────────────────────────────────────
export default async function planEngineRoutes(fastify) {

  // POST /api/erp/plan-engine/run — manual trigger
  fastify.post('/run', async (req, reply) => {
    try {
      const result = await runPlanningEngine('MANUAL')
      return { success: true, ...result }
    } catch (err) {
      return reply.status(500).send({ success: false, error: err.message })
    }
  })

  // GET /api/erp/plan-engine/plans — list plans
  fastify.get('/plans', async (req) => {
    const { section, status, date, diNo } = req.query
    const where = {}
    if (section) where.sectionType = section
    if (status)  where.status      = status
    if (diNo)    where.diNo        = { contains: diNo, mode: 'insensitive' }
    if (date) {
      const d = new Date(date)
      where.plannedDate = {
        gte: new Date(d.toISOString().split('T')[0] + 'T00:00:00.000Z'),
        lte: new Date(d.toISOString().split('T')[0] + 'T23:59:59.999Z'),
      }
    }
    const plans = await prisma.productionPlan.findMany({
      where,
      orderBy: [{ sectionType: 'asc' }, { plannedDate: 'asc' }],
    })

    // Resolve productCode for any plans that were saved without one
    const resolvedPlans = await Promise.all(plans.map(async (plan) => {
      if (plan.productCode || !plan.productName) return plan
      const pm = await prisma.productMaster.findFirst({
        where: { productName: { equals: plan.productName, mode: 'insensitive' } },
        select: { productCode: true },
      })
      if (!pm) return plan
      // Persist the resolved code so next load is instant
      await prisma.productionPlan.update({
        where: { id: plan.id },
        data:  { productCode: pm.productCode },
      })
      return { ...plan, productCode: pm.productCode }
    }))

    return { success: true, data: resolvedPlans }
  })

  // GET /api/erp/plan-engine/plans/:id
  fastify.get('/plans/:id', async (req, reply) => {
    const plan = await prisma.productionPlan.findUnique({ where: { id: req.params.id } })
    if (!plan) return reply.status(404).send({ success: false, error: 'Plan not found' })
    return { success: true, data: plan }
  })

  // PATCH /api/erp/plan-engine/plans/:id — update plan details / status
  fastify.patch('/plans/:id', async (req, reply) => {
    const allowed = [
      'status', 'shift', 'batchIncharge', 'equipment', 'location',
      'batchCode', 'plannedDate', 'carrier', 'specs', 'process', 'stageInfo',
      'unitPackQty', 'noOfUnits', 'pp1', 'pp2', 'sp1', 'noOfSp',
      'labels', 'packingSpec', 'perDayCompletion', 'femaleWorkers', 'maleWorkers',
      'remarks', 'eqpCheckStatus', 'noOfCycles', 'cycleBatchSize',
    ]
    const intFields   = new Set(['noOfUnits','noOfSp','perDayCompletion','femaleWorkers','maleWorkers','noOfCycles'])
    const floatFields = new Set(['unitPackQty','cycleBatchSize'])
    const data = {}
    for (const k of allowed) {
      if (req.body[k] !== undefined) {
        if (k === 'plannedDate')       data[k] = req.body[k] ? new Date(req.body[k]) : null
        else if (intFields.has(k))     data[k] = req.body[k] !== null && req.body[k] !== '' ? parseInt(req.body[k]) : null
        else if (floatFields.has(k))   data[k] = req.body[k] !== null && req.body[k] !== '' ? parseFloat(req.body[k]) : null
        else                           data[k] = req.body[k]
      }
    }

    // If status moves to REVIEWED, also update the SO item if needed
    const plan = await prisma.productionPlan.update({
      where: { id: req.params.id },
      data,
    })

    // Sync SO item status if plan pushed to IN_PROGRESS
    if (data.status === 'IN_PROGRESS' && plan.salesOrderItemId) {
      await prisma.salesOrderItem.update({
        where: { id: plan.salesOrderItemId },
        data:  { status: 'UNDER_PRODUCTION' },
      }).catch(() => {}) // soft fail
    }
    if (data.status === 'COMPLETED' && plan.salesOrderItemId) {
      await prisma.salesOrderItem.update({
        where: { id: plan.salesOrderItemId },
        data:  { status: 'PACKED' },
      }).catch(() => {})
    }

    return { success: true, data: plan }
  })

  // DELETE /api/erp/plan-engine/plans/:id — cancel a plan
  fastify.delete('/plans/:id', async (req) => {
    const plan = await prisma.productionPlan.update({
      where: { id: req.params.id },
      data:  { status: 'CANCELLED' },
    })
    // Revert SO item to PENDING so it can be re-planned
    if (plan.salesOrderItemId) {
      await prisma.salesOrderItem.update({
        where: { id: plan.salesOrderItemId },
        data:  { status: 'PENDING' },
      }).catch(() => {})
    }
    return { success: true }
  })

  // GET /api/erp/plan-engine/logs — last N planner runs
  fastify.get('/logs', async () => {
    const logs = await prisma.plannerLog.findMany({
      orderBy: { runAt: 'desc' },
      take: 10,
    })
    return { success: true, data: logs }
  })

  // GET /api/erp/plan-engine/dashboard — summary counts
  fastify.get('/dashboard', async () => {
    const sections = ['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES']
    const statuses = ['DRAFT', 'REVIEWED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

    const [bySectionRaw, byStatusRaw, pendingOrders, lastLog] = await Promise.all([
      Promise.all(sections.map(s =>
        prisma.productionPlan.count({ where: { sectionType: s, status: { notIn: ['CANCELLED'] } } })
          .then(c => ({ section: s, count: c }))
      )),
      Promise.all(statuses.map(s =>
        prisma.productionPlan.count({ where: { status: s } })
          .then(c => ({ status: s, count: c }))
      )),
      prisma.salesOrderItem.count({ where: { status: 'PENDING' } }),
      prisma.plannerLog.findFirst({ orderBy: { runAt: 'desc' } }),
    ])

    return {
      success: true,
      data: {
        bySection: bySectionRaw,
        byStatus:  byStatusRaw,
        pendingOrders,
        lastRun:   lastLog,
      }
    }
  })

  // GET /api/erp/plan-engine/pending-orders — orders waiting to be planned
  fastify.get('/pending-orders', async () => {
    const items = await prisma.salesOrderItem.findMany({
      where: { status: 'PENDING' },
      include: {
        salesOrder: {
          select: { soId: true, diNo: true, customerName: true, priority: true,
                    estimatedDispatchDate: true, company: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    })
    return { success: true, data: items }
  })
}
