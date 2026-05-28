/**
 * Sales Order Routes — /api/erp/sales/*
 * Sales Orders, Dispatch, MS365 Excel Sync
 */
import prisma from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { writeAudit, auditUser } from '../middleware/audit.js'

const salesOrAbove   = authorize(['sales_team', 'admin', 'planner', 'planning_manager'])
const plannerOrAbove = authorize(['planner', 'planning_manager', 'admin'])
const adminOnly      = authorize(['admin'])

export default async function erpSalesRoutes(fastify) {

  // ─── GET /api/erp/sales/orders ────────────────────────────────────────────
  fastify.get('/orders', { preHandler: authenticate }, async (req) => {
    const { status, priority, from_etd, to_etd, product_code, limit = 100, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT so.*
      FROM sales_orders so
      WHERE (${status || null}::text IS NULL OR so.status = ${status || null})
        AND (${priority || null}::text IS NULL OR so.priority = ${priority || null})
        AND (${product_code || null}::text IS NULL OR so.product_code = ${product_code || null})
        AND (${from_etd || null}::date IS NULL OR so.etd >= ${from_etd || null}::date)
        AND (${to_etd || null}::date IS NULL OR so.etd <= ${to_etd || null}::date)
      ORDER BY so.priority DESC, so.etd ASC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    const total = await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM sales_orders`
    return { success: true, data, total: Number(total[0].cnt) }
  })

  // ─── GET single order ─────────────────────────────────────────────────────
  fastify.get('/orders/:di', { preHandler: authenticate }, async (req, reply) => {
    const rows = await prisma.$queryRaw`
      SELECT so.*, od.invoice_number, od.dispatch_date, od.transport_name
      FROM sales_orders so
      LEFT JOIN order_dispatch od ON od.di_number = so.di_number
      WHERE so.di_number = ${req.params.di}
    `
    if (!rows[0]) return reply.status(404).send({ success: false, error: 'Order not found' })
    return { success: true, data: rows[0] }
  })

  // ─── POST — create order (sales_team) ─────────────────────────────────────
  fastify.post('/orders', { preHandler: salesOrAbove }, async (req, reply) => {
    const {
      di_number, company, order_type, customer_name, order_date, etd,
      product_code, order_qty, qty_unit, active_ingredient, specifications,
      carrier, per_unit_qty_pp, primary_pack_type, secondary_pack_type,
      label_type, priority, sales_staff, notes,
    } = req.body || {}
    if (!di_number || !product_code || !order_qty || !etd || !order_date)
      return reply.status(400).send({ success: false, error: 'di_number, product_code, order_qty, order_date, etd required' })
    if (new Date(order_date) > new Date())
      return reply.status(400).send({ success: false, error: 'order_date cannot be in the future' })
    if (new Date(etd) <= new Date(order_date))
      return reply.status(400).send({ success: false, error: 'etd must be after order_date' })

    // Validate product exists
    const prod = await prisma.$queryRaw`SELECT product_code, product_name FROM erp_products WHERE product_code = ${product_code}`
    if (!prod[0]) return reply.status(400).send({ success: false, error: 'Product code not found in product master' })

    try {
      const rows = await prisma.$queryRaw`
        INSERT INTO sales_orders (di_number, company, order_type, status, customer_name, order_date, etd,
          product_code, product_name, order_qty, qty_unit, active_ingredient, specifications, carrier,
          per_unit_qty_pp, primary_pack_type, secondary_pack_type, label_type, priority, sales_staff, notes)
        VALUES (${di_number}, ${company || null}, ${order_type || 'Domestic'}, 'new',
          ${customer_name || null}, ${order_date}, ${etd},
          ${product_code}, ${prod[0].product_name}, ${order_qty}, ${qty_unit || 'kg'},
          ${active_ingredient || null}, ${specifications || null}, ${carrier || null},
          ${per_unit_qty_pp || null}, ${primary_pack_type || null}, ${secondary_pack_type || null},
          ${label_type || null}, ${priority || 'Normal'}, ${sales_staff || null}, ${notes || null})
        RETURNING *
      `
      await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'sales_orders', recordId: di_number, newValue: req.body })
      return reply.status(201).send({ success: true, data: rows[0] })
    } catch (e) {
      if (e.message?.includes('unique') || e.message?.includes('duplicate'))
        return reply.status(409).send({ success: false, error: `DI number ${di_number} already exists` })
      throw e
    }
  })

  // ─── PATCH — update order ─────────────────────────────────────────────────
  fastify.patch('/orders/:di', { preHandler: salesOrAbove }, async (req, reply) => {
    const di = req.params.di
    const current = await prisma.$queryRaw`SELECT * FROM sales_orders WHERE di_number = ${di}`
    if (!current[0]) return reply.status(404).send({ success: false, error: 'Order not found' })

    const { status, etd, order_qty, priority, notes, ...rest } = req.body || {}

    // Sales team can only set new → confirmed
    if (status && req.user?.role === 'sales_team') {
      if (!(current[0].status === 'new' && status === 'confirmed'))
        return reply.status(403).send({ success: false, error: 'Sales team can only move orders from new → confirmed' })
    }

    // ERP handles status beyond confirmed
    if (status && ['planned','in_production','dispatched'].includes(status) && req.user?.role === 'sales_team')
      return reply.status(403).send({ success: false, error: 'ERP system manages statuses beyond confirmed' })

    await prisma.$executeRaw`
      UPDATE sales_orders SET
        status   = COALESCE(${status || null}, status),
        etd      = COALESCE(${etd || null}::date, etd),
        order_qty = COALESCE(${order_qty || null}, order_qty),
        priority = COALESCE(${priority || null}, priority),
        notes    = COALESCE(${notes || null}, notes),
        updated_at = NOW()
      WHERE di_number = ${di}
    `
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'sales_orders', recordId: di, oldValue: current[0], newValue: req.body })
    const updated = await prisma.$queryRaw`SELECT * FROM sales_orders WHERE di_number = ${di}`
    return { success: true, data: updated[0] }
  })

  // ─── PATCH :di/cancel — mark cancelled (never delete) ────────────────────
  fastify.patch('/orders/:di/cancel', { preHandler: authorize(['admin', 'planning_manager']) }, async (req, reply) => {
    await prisma.$executeRaw`
      UPDATE sales_orders SET status = 'cancelled', updated_at = NOW() WHERE di_number = ${req.params.di}
    `
    await writeAudit({ ...auditUser(req), action: 'CANCEL', tableName: 'sales_orders', recordId: req.params.di })
    return { success: true, message: 'Order marked cancelled (not deleted)' }
  })

  // ─── POST /orders/:di/dispatch — record dispatch details ─────────────────
  fastify.post('/orders/:di/dispatch', { preHandler: authorize(['admin', 'store_manager', 'planning_manager']) }, async (req, reply) => {
    const { invoice_number, invoice_date, transport_name, dispatched_by, dispatch_date, dispatch_notes } = req.body || {}
    if (!invoice_number) return reply.status(400).send({ success: false, error: 'invoice_number required' })

    const rows = await prisma.$queryRaw`
      INSERT INTO order_dispatch (di_number, invoice_number, invoice_date, transport_name,
        dispatched_by, dispatch_date, dispatch_notes)
      VALUES (${req.params.di}, ${invoice_number}, ${invoice_date || null}::date,
              ${transport_name || null}, ${req.user?.user_id || null}::uuid,
              ${dispatch_date || null}::date, ${dispatch_notes || null})
      RETURNING *
    `
    await prisma.$executeRaw`
      UPDATE sales_orders SET status = 'dispatched', updated_at = NOW() WHERE di_number = ${req.params.di}
    `
    await writeAudit({ ...auditUser(req), action: 'DISPATCH', tableName: 'order_dispatch', recordId: rows[0].dispatch_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  // ─── GET dispatch records ─────────────────────────────────────────────────
  fastify.get('/dispatch', { preHandler: authenticate }, async (req) => {
    const { from, to, limit = 100, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT od.*, so.customer_name, so.product_name, so.order_qty, so.qty_unit,
             u.full_name AS dispatched_by_name
      FROM order_dispatch od
      JOIN sales_orders so ON so.di_number = od.di_number
      LEFT JOIN users u ON u.user_id = od.dispatched_by
      WHERE (${from || null}::date IS NULL OR od.dispatch_date >= ${from || null}::date)
        AND (${to || null}::date IS NULL OR od.dispatch_date <= ${to || null}::date)
      ORDER BY od.dispatch_date DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return { success: true, data }
  })

  // ─── GET at-risk orders (ETD ≤ 7 days, not dispatched) ───────────────────
  fastify.get('/orders/at-risk', { preHandler: authenticate }, async () => {
    const sevenDaysOut = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const today = new Date().toISOString().slice(0, 10)
    const data = await prisma.$queryRaw`
      SELECT * FROM sales_orders
      WHERE etd <= ${sevenDaysOut}::date
        AND etd >= ${today}::date
        AND status NOT IN ('dispatched', 'cancelled')
      ORDER BY etd ASC, priority DESC
    `
    return { success: true, data }
  })

  // ─── POST /sync — manual trigger for MS365 Excel sync ────────────────────
  fastify.post('/sync', { preHandler: plannerOrAbove }, async (req, reply) => {
    try {
      const result = await syncFromExcel()
      return { success: true, ...result }
    } catch (e) {
      return reply.status(500).send({ success: false, error: e.message })
    }
  })

  // ─── GET /planner-queue — confirmed orders within planning horizon ─────────
  fastify.get('/planner-queue', { preHandler: plannerOrAbove }, async (req) => {
    const horizonDays = Number(req.query.horizon || 3)
    const horizonDate = new Date(Date.now() + horizonDays * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    const data = await prisma.$queryRaw`
      SELECT so.*, ep.is_microbial, ep.consolidation_window_days, ep.plant_id,
             pp.plan_id, pp.status AS plan_status
      FROM sales_orders so
      LEFT JOIN erp_products ep ON ep.product_code = so.product_code
      LEFT JOIN production_plans pp ON pp.di_number = so.di_number AND pp.status != 'cancelled'
      WHERE so.status = 'confirmed'
        AND so.etd <= ${horizonDate}::date
      ORDER BY so.priority DESC, so.etd ASC
    `
    return { success: true, data }
  })
}

// ─── MS365 Excel Sync ──────────────────────────────────────────────────────
async function syncFromExcel() {
  const MS365_ENABLED = process.env.MS365_ENABLED === 'true'
  if (!MS365_ENABLED) return { message: 'MS365 sync disabled. Set MS365_ENABLED=true to enable.', synced: 0 }

  const tenantId     = process.env.MS365_TENANT_ID
  const clientId     = process.env.MS365_CLIENT_ID
  const clientSecret = process.env.MS365_CLIENT_SECRET
  const fileId       = process.env.MS365_FILE_ID
  const sheetName    = process.env.MS365_SHEET_NAME || 'Sales_Orders'

  // Get OAuth token
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret,
      scope: 'https://graph.microsoft.com/.default',
    }),
  })
  const { access_token } = await tokenRes.json()

  // Read worksheet
  const sheetRes = await fetch(
    `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}/workbook/worksheets/${sheetName}/usedRange`,
    { headers: { Authorization: `Bearer ${access_token}` } }
  )
  const sheetData = await sheetRes.json()
  const rows = sheetData.values || []
  if (rows.length < 2) return { synced: 0, message: 'No data rows found' }

  const headers = rows[0].map(h => h?.toString().trim().toLowerCase().replace(/\s+/g, '_'))
  const col = (name) => headers.indexOf(name)
  let synced = 0, created = 0, updated = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    const di_number = row[col('di_number')]?.toString().trim()
    if (!di_number) continue

    const rowData = {
      di_number,
      company:             row[col('company')] || null,
      order_type:          row[col('order_type')] || 'Domestic',
      customer_name:       row[col('customer_name')] || null,
      order_date:          row[col('order_date')] || null,
      etd:                 row[col('etd')] || null,
      product_code:        row[col('product_code')] || null,
      order_qty:           parseFloat(row[col('order_qty')]) || null,
      qty_unit:            row[col('qty_unit')] || 'kg',
      active_ingredient:   row[col('active_ingredient')] || null,
      specifications:      row[col('specifications')] || null,
      carrier:             row[col('carrier')] || null,
      per_unit_qty_pp:     parseFloat(row[col('per_unit_qty_pp')]) || null,
      primary_pack_type:   row[col('primary_pack_type')] || null,
      secondary_pack_type: row[col('secondary_pack_type')] || null,
      label_type:          row[col('label_type')] || null,
      priority:            row[col('priority')] || 'Normal',
      sales_staff:         row[col('sales_staff')] || null,
      notes:               row[col('notes')] || null,
    }

    const existing = await prisma.$queryRaw`SELECT di_number, etd, order_qty, status FROM sales_orders WHERE di_number = ${di_number}`

    if (!existing[0]) {
      // New order — insert
      const prod = await prisma.$queryRaw`SELECT product_name FROM erp_products WHERE product_code = ${rowData.product_code}`
      if (!prod[0]) continue // Skip if product not in master
      await prisma.$executeRaw`
        INSERT INTO sales_orders (di_number, company, order_type, status, customer_name, order_date, etd,
          product_code, product_name, order_qty, qty_unit, active_ingredient, specifications, carrier,
          per_unit_qty_pp, primary_pack_type, secondary_pack_type, label_type, priority, sales_staff, notes,
          excel_synced_at)
        VALUES (${rowData.di_number}, ${rowData.company}, ${rowData.order_type}, 'new',
          ${rowData.customer_name}, ${rowData.order_date}::date, ${rowData.etd}::date,
          ${rowData.product_code}, ${prod[0].product_name}, ${rowData.order_qty}, ${rowData.qty_unit},
          ${rowData.active_ingredient}, ${rowData.specifications}, ${rowData.carrier},
          ${rowData.per_unit_qty_pp}, ${rowData.primary_pack_type}, ${rowData.secondary_pack_type},
          ${rowData.label_type}, ${rowData.priority}, ${rowData.sales_staff}, ${rowData.notes}, NOW())
        ON CONFLICT (di_number) DO NOTHING
      `
      created++
    } else if (existing[0].status !== 'cancelled') {
      // Check for changes to ETD or qty
      const etdChanged = rowData.etd && existing[0].etd?.toISOString().slice(0, 10) !== new Date(rowData.etd).toISOString().slice(0, 10)
      const qtyChanged = rowData.order_qty && Math.abs(Number(existing[0].order_qty) - rowData.order_qty) > 0.001

      if (etdChanged || qtyChanged) {
        await prisma.$executeRaw`
          UPDATE sales_orders SET
            etd = ${rowData.etd}::date,
            order_qty = ${rowData.order_qty},
            status = CASE WHEN status IN ('confirmed','planned') THEN 'at_risk' ELSE status END,
            excel_synced_at = NOW(), updated_at = NOW()
          WHERE di_number = ${di_number}
        `
        updated++
      }
    }
    synced++
  }

  return { synced, created, updated, message: `Sync complete: ${created} created, ${updated} updated` }
}

// Export for cron job use
export { syncFromExcel }
