/**
 * Inventory Routes — /api/erp/inventory/*
 * Stock Adjustments, Warehouse Transfers, Decanting (Pack Size Reduction)
 * FIFO enforcement on all issuances
 */
import prisma from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { writeAudit, auditUser } from '../middleware/audit.js'
import { createNotification } from '../services/notification-service.js'

const storeOrAbove   = authorize(['store_person', 'store_manager', 'admin'])
const managerOrAbove = authorize(['store_manager', 'admin'])

export default async function erpInventoryRoutes(fastify) {

  // ═══════════════════════════════════════════════════════════════════════════
  // STOCK ADJUSTMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  // POST — raise adjustment (store_person or above)
  fastify.post('/adjustments', { preHandler: storeOrAbove }, async (req, reply) => {
    const { pack_id, reason_code, qty_after, notes } = req.body || {}
    if (!pack_id || !reason_code || qty_after === undefined)
      return reply.status(400).send({ success: false, error: 'pack_id, reason_code, qty_after required' })

    // Validate reason code
    const rc = await prisma.$queryRaw`
      SELECT code FROM reason_codes WHERE category = 'stock_adjustment' AND code = ${reason_code} AND is_active = true
    `
    if (!rc[0]) return reply.status(400).send({ success: false, error: `Invalid reason_code: ${reason_code}. Must be from predefined list.` })

    const pack = await prisma.$queryRaw`SELECT * FROM erp_packs WHERE pack_id = ${pack_id}::uuid`
    if (!pack[0]) return reply.status(404).send({ success: false, error: 'Pack not found' })
    if (!pack[0].qr_confirmed)
      return reply.status(400).send({ success: false, error: 'Cannot adjust pack without QR confirmation' })

    const qty_before = Number(pack[0].qty_remaining)
    const delta = Number(qty_after) - qty_before

    const rows = await prisma.$queryRaw`
      INSERT INTO stock_adjustments (pack_id, item_code, reason_code, qty_before, qty_after, delta,
        raised_by, status, notes)
      VALUES (${pack_id}::uuid, ${pack[0].item_code}, ${reason_code}, ${qty_before}, ${qty_after},
              ${delta}, ${req.user?.user_id || null}::uuid, 'pending', ${notes || null})
      RETURNING *
    `
    const adj = rows[0]

    // Notify store manager for approval
    await createNotification({
      type: 'adj_pending_approval',
      title: 'Stock Adjustment Pending Approval',
      message: `Adjustment for pack ${pack[0].lot_number} (${pack[0].item_code}): ${qty_before} → ${qty_after} (${delta > 0 ? '+' : ''}${delta}). Reason: ${reason_code}. Raised by: ${req.user?.full_name || req.user?.username}.`,
      targetRole: 'store_manager',
      refType: 'stock_adjustment',
      refId: adj.adjustment_id,
    })

    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'stock_adjustments', recordId: adj.adjustment_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: adj })
  })

  // PATCH :id/approve — store manager approves (separate login required)
  fastify.patch('/adjustments/:id/approve', { preHandler: managerOrAbove }, async (req, reply) => {
    const adj = await prisma.$queryRaw`
      SELECT * FROM stock_adjustments WHERE adjustment_id = ${req.params.id}::uuid
    `
    if (!adj[0]) return reply.status(404).send({ success: false, error: 'Adjustment not found' })
    if (adj[0].status !== 'pending') return reply.status(400).send({ success: false, error: 'Adjustment is not pending' })

    // Prevent same person approving their own adjustment
    if (adj[0].raised_by?.toString() === req.user?.user_id?.toString())
      return reply.status(403).send({ success: false, error: 'Cannot approve your own adjustment. Two separate logins required.' })

    // Apply the adjustment
    await prisma.$executeRaw`
      UPDATE erp_packs SET
        qty_remaining = ${adj[0].qty_after},
        status = CASE
          WHEN ${adj[0].qty_after} = 0 THEN 'exhausted'
          WHEN ${adj[0].qty_after} < qty_received THEN 'partial'
          ELSE status
        END,
        updated_at = NOW()
      WHERE pack_id = ${adj[0].pack_id}::uuid
    `
    await prisma.$executeRaw`
      UPDATE stock_adjustments SET status = 'approved', approved_by = ${req.user?.user_id || null}::uuid,
        approved_at = NOW()
      WHERE adjustment_id = ${req.params.id}::uuid
    `

    await writeAudit({
      ...auditUser(req), action: 'APPROVE', tableName: 'stock_adjustments',
      recordId: req.params.id, newValue: { approved: true, qty_applied: adj[0].qty_after },
    })
    return { success: true, message: 'Adjustment approved and applied' }
  })

  // PATCH :id/reject
  fastify.patch('/adjustments/:id/reject', { preHandler: managerOrAbove }, async (req, reply) => {
    await prisma.$executeRaw`
      UPDATE stock_adjustments SET status = 'rejected', approved_by = ${req.user?.user_id || null}::uuid,
        approved_at = NOW(), notes = CONCAT(notes, ' | Rejected: ', ${req.body?.reason || ''})
      WHERE adjustment_id = ${req.params.id}::uuid AND status = 'pending'
    `
    await writeAudit({ ...auditUser(req), action: 'REJECT', tableName: 'stock_adjustments', recordId: req.params.id })
    return { success: true, message: 'Adjustment rejected' }
  })

  // GET adjustments list
  fastify.get('/adjustments', { preHandler: storeOrAbove }, async (req) => {
    const { status, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT sa.*, p.lot_number, p.item_code,
             u1.full_name AS raised_by_name, u2.full_name AS approved_by_name
      FROM stock_adjustments sa
      JOIN erp_packs p ON p.pack_id = sa.pack_id
      LEFT JOIN users u1 ON u1.user_id = sa.raised_by
      LEFT JOIN users u2 ON u2.user_id = sa.approved_by
      WHERE (${status || null}::text IS NULL OR sa.status = ${status || null})
      ORDER BY sa.raised_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return { success: true, data }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // WAREHOUSE TRANSFERS
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.post('/transfers', { preHandler: storeOrAbove }, async (req, reply) => {
    const { pack_id, transfer_type, from_location, to_location, from_plant_id, to_plant_id, notes } = req.body || {}
    if (!pack_id || !transfer_type)
      return reply.status(400).send({ success: false, error: 'pack_id and transfer_type required' })

    const pack = await prisma.$queryRaw`SELECT * FROM erp_packs WHERE pack_id = ${pack_id}::uuid`
    if (!pack[0]) return reply.status(404).send({ success: false, error: 'Pack not found' })
    if (!pack[0].qr_confirmed)
      return reply.status(400).send({ success: false, error: 'Pack must be QR-confirmed before transfer' })

    if (transfer_type === 'intra_plant') {
      // Simple location update
      await prisma.$executeRaw`
        UPDATE erp_packs SET location = ${to_location}, updated_at = NOW()
        WHERE pack_id = ${pack_id}::uuid
      `
      const rows = await prisma.$queryRaw`
        INSERT INTO warehouse_transfers (pack_id, transfer_type, from_location, to_location,
          from_plant_id, to_plant_id, initiated_by, status, notes)
        VALUES (${pack_id}::uuid, ${transfer_type}, ${from_location || pack[0].location},
                ${to_location}, ${from_plant_id || null}::uuid, ${to_plant_id || null}::uuid,
                ${req.user?.user_id || null}::uuid, 'completed', ${notes || null})
        RETURNING *
      `
      await writeAudit({ ...auditUser(req), action: 'TRANSFER', tableName: 'warehouse_transfers', recordId: rows[0].transfer_id, newValue: req.body })
      return reply.status(201).send({ success: true, data: rows[0], message: 'Intra-plant transfer completed' })
    } else {
      // Inter-plant: create pending transfer
      const rows = await prisma.$queryRaw`
        INSERT INTO warehouse_transfers (pack_id, transfer_type, from_location, to_location,
          from_plant_id, to_plant_id, initiated_by, status, notes)
        VALUES (${pack_id}::uuid, ${transfer_type}, ${from_location || pack[0].location},
                ${to_location || null}, ${from_plant_id || null}::uuid, ${to_plant_id || null}::uuid,
                ${req.user?.user_id || null}::uuid, 'pending', ${notes || null})
        RETURNING *
      `
      // Mark pack as in-transit
      await prisma.$executeRaw`UPDATE erp_packs SET status = 'in_transit', updated_at = NOW() WHERE pack_id = ${pack_id}::uuid`

      await createNotification({
        type: 'transfer_pending',
        title: 'Inter-plant Transfer Pending Receipt',
        message: `Pack ${pack[0].lot_number} (${pack[0].item_code}) transferred from ${from_location || 'current location'} to ${to_location || 'new plant'}. Please scan and accept at receiving end.`,
        targetRole: 'store_person',
        refType: 'warehouse_transfer',
        refId: rows[0].transfer_id,
      })

      await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'warehouse_transfers', recordId: rows[0].transfer_id, newValue: req.body })
      return reply.status(201).send({ success: true, data: rows[0], message: 'Inter-plant transfer initiated. Pending receipt at destination.' })
    }
  })

  // PATCH :id/receive — receiving plant accepts transfer
  fastify.patch('/transfers/:id/receive', { preHandler: storeOrAbove }, async (req, reply) => {
    const { to_location } = req.body || {}
    const transfer = await prisma.$queryRaw`SELECT * FROM warehouse_transfers WHERE transfer_id = ${req.params.id}::uuid`
    if (!transfer[0]) return reply.status(404).send({ success: false, error: 'Transfer not found' })
    if (transfer[0].status !== 'pending') return reply.status(400).send({ success: false, error: 'Transfer is not pending' })

    await prisma.$executeRaw`
      UPDATE erp_packs SET
        location = ${to_location || transfer[0].to_location},
        status = 'active',
        updated_at = NOW()
      WHERE pack_id = ${transfer[0].pack_id}::uuid
    `
    await prisma.$executeRaw`
      UPDATE warehouse_transfers SET status = 'completed',
        received_by = ${req.user?.user_id || null}::uuid,
        received_at = NOW(),
        to_location = COALESCE(${to_location || null}, to_location)
      WHERE transfer_id = ${req.params.id}::uuid
    `
    await writeAudit({ ...auditUser(req), action: 'RECEIVE', tableName: 'warehouse_transfers', recordId: req.params.id })
    return { success: true, message: 'Transfer received and pack is now active at new location' }
  })

  fastify.get('/transfers', { preHandler: storeOrAbove }, async (req) => {
    const { status, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT wt.*, p.lot_number, p.item_code, u.full_name AS initiated_by_name
      FROM warehouse_transfers wt
      JOIN erp_packs p ON p.pack_id = wt.pack_id
      LEFT JOIN users u ON u.user_id = wt.initiated_by
      WHERE (${status || null}::text IS NULL OR wt.status = ${status || null})
      ORDER BY wt.initiated_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return { success: true, data }
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // DECANTING (PACK SIZE REDUCTION)
  // ═══════════════════════════════════════════════════════════════════════════

  fastify.post('/decanting', { preHandler: storeOrAbove }, async (req, reply) => {
    const { source_pack_id, target_container_id, qty_to_transfer, qty_actual } = req.body || {}
    if (!source_pack_id || !target_container_id || qty_to_transfer === undefined)
      return reply.status(400).send({ success: false, error: 'source_pack_id, target_container_id, qty_to_transfer required' })

    const pack = await prisma.$queryRaw`SELECT * FROM erp_packs WHERE pack_id = ${source_pack_id}::uuid`
    if (!pack[0]) return reply.status(404).send({ success: false, error: 'Source pack not found' })
    if (!pack[0].qr_confirmed) return reply.status(400).send({ success: false, error: 'Source pack not QR confirmed' })
    if (Number(pack[0].qty_remaining) < Number(qty_to_transfer))
      return reply.status(400).send({ success: false, error: `Insufficient qty. Available: ${pack[0].qty_remaining}` })

    const container = await prisma.$queryRaw`SELECT * FROM erp_containers WHERE container_id = ${target_container_id}`
    if (!container[0]) return reply.status(404).send({ success: false, error: 'Target container not found' })
    if (container[0].item_code !== pack[0].item_code)
      return reply.status(400).send({ success: false, error: `Container is for ${container[0].item_code}, pack is ${pack[0].item_code}. Item mismatch.` })

    const actualQty = qty_actual !== undefined ? Number(qty_actual) : Number(qty_to_transfer)
    const tolerance = Number(pack[0].decanting_tolerance_pct || 0.5) / 100
    // Actually get tolerance from item master
    const item = await prisma.$queryRaw`SELECT decanting_tolerance_pct FROM erp_items WHERE item_code = ${pack[0].item_code}`
    const tolerancePct = Number(item[0]?.decanting_tolerance_pct || 0.5)
    const variancePct = Math.abs(actualQty - Number(qty_to_transfer)) / Number(qty_to_transfer) * 100
    const needsApproval = variancePct > tolerancePct

    if (needsApproval && !req.body.supervisor_approved) {
      // Return 422 asking for supervisor approval
      return reply.status(422).send({
        success: false,
        needs_approval: true,
        variance_pct: variancePct.toFixed(3),
        tolerance_pct: tolerancePct,
        message: `Actual qty (${actualQty}) differs from entered qty (${qty_to_transfer}) by ${variancePct.toFixed(2)}%, which exceeds tolerance of ${tolerancePct}%. Supervisor approval required.`,
      })
    }

    // Apply decanting
    const newPackQty = Number(pack[0].qty_remaining) - actualQty
    const newContainerQty = Number(container[0].current_qty) + actualQty

    if (newContainerQty > Number(container[0].max_capacity))
      return reply.status(400).send({ success: false, error: `Container overflow. Max capacity: ${container[0].max_capacity}, current: ${container[0].current_qty}, adding: ${actualQty}` })

    await prisma.$executeRaw`
      UPDATE erp_packs SET qty_remaining = ${newPackQty},
        status = CASE WHEN ${newPackQty} = 0 THEN 'exhausted' ELSE 'partial' END,
        updated_at = NOW()
      WHERE pack_id = ${source_pack_id}::uuid
    `
    await prisma.$executeRaw`
      UPDATE erp_containers SET current_qty = ${newContainerQty}, last_replenished_at = NOW(), updated_at = NOW()
      WHERE container_id = ${target_container_id}
    `

    const log = await prisma.$queryRaw`
      INSERT INTO decanting_log (source_pack_id, target_container, qty_entered, qty_actual,
        variance_pct, tolerance_pct, needs_approval, approved_by, performed_by, status)
      VALUES (${source_pack_id}::uuid, ${target_container_id}, ${qty_to_transfer}, ${actualQty},
              ${variancePct}, ${tolerancePct}, ${needsApproval},
              ${req.body.supervisor_approved ? req.user?.user_id || null : null}::uuid,
              ${req.user?.user_id || null}::uuid, 'completed')
      RETURNING *
    `

    // Check low stock threshold
    if (newContainerQty <= Number(container[0].low_stock_threshold)) {
      await createNotification({
        type: 'rm_reorder',
        title: `Container Low Stock: ${container[0].container_id}`,
        message: `Container ${container[0].container_id} (${pack[0].item_code}) is at ${newContainerQty} ${pack[0].unit}, below threshold of ${container[0].low_stock_threshold}. Replenishment needed.`,
        targetRole: 'store_manager',
        refType: 'erp_container',
        refId: target_container_id,
      })
    }

    await writeAudit({ ...auditUser(req), action: 'DECANT', tableName: 'decanting_log', recordId: log[0].id, newValue: req.body })
    return reply.status(201).send({ success: true, data: log[0] })
  })

  fastify.get('/decanting', { preHandler: storeOrAbove }, async (req) => {
    const { pack_id, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT dl.*, p.lot_number, p.item_code, u.full_name AS performed_by_name
      FROM decanting_log dl
      JOIN erp_packs p ON p.pack_id = dl.source_pack_id
      LEFT JOIN users u ON u.user_id = dl.performed_by
      WHERE (${pack_id || null}::uuid IS NULL OR dl.source_pack_id = ${pack_id || null}::uuid)
      ORDER BY dl.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return { success: true, data }
  })

  // ── FIFO check helper — used by BOM issuance ──────────────────────────────
  // POST /api/erp/inventory/fifo-check — returns oldest lot info
  fastify.post('/fifo-check', { preHandler: authenticate }, async (req, reply) => {
    const { item_code, selected_pack_id } = req.body || {}
    if (!item_code || !selected_pack_id)
      return reply.status(400).send({ success: false, error: 'item_code and selected_pack_id required' })

    const oldest = await prisma.$queryRaw`
      SELECT pack_id, lot_number, qty_remaining, inward_date FROM erp_packs
      WHERE item_code = ${item_code}
        AND qr_confirmed = true
        AND status IN ('active', 'partial')
        AND qty_remaining > 0
      ORDER BY inward_date ASC, created_at ASC
      LIMIT 1
    `
    if (!oldest[0]) return { success: true, fifo_ok: true }
    if (oldest[0].pack_id.toString() === selected_pack_id.toString()) return { success: true, fifo_ok: true }

    return {
      success: true,
      fifo_ok: false,
      oldest_lot: oldest[0].lot_number,
      oldest_qty: oldest[0].qty_remaining,
      oldest_inward_date: oldest[0].inward_date,
      oldest_pack_id: oldest[0].pack_id,
    }
  })

  // POST /api/erp/inventory/fifo-override — log manager override
  fastify.post('/fifo-override', { preHandler: managerOrAbove }, async (req, reply) => {
    const { job_id, item_code, older_lot, older_qty, selected_lot, reason } = req.body || {}
    if (!reason) return reply.status(400).send({ success: false, error: 'reason is mandatory for FIFO override' })

    const rows = await prisma.$queryRaw`
      INSERT INTO fifo_override_log (job_id, item_code, older_lot, older_qty, selected_lot, override_by, reason)
      VALUES (${job_id || null}::uuid, ${item_code || null}, ${older_lot || null},
              ${older_qty || null}, ${selected_lot || null},
              ${req.user?.user_id || null}::uuid, ${reason})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'FIFO_OVERRIDE', tableName: 'fifo_override_log', recordId: rows[0].id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0], message: 'FIFO override logged. You may proceed with selected lot.' })
  })

  // ── Stock level overview ──────────────────────────────────────────────────
  fastify.get('/stock-summary', { preHandler: authenticate }, async () => {
    const data = await prisma.$queryRaw`
      SELECT
        p.item_code,
        i.item_name,
        i.item_category,
        i.uom,
        i.reorder_level,
        i.warehouse_zone,
        COUNT(p.pack_id) AS pack_count,
        SUM(p.qty_remaining) AS total_qty,
        MIN(p.inward_date) AS oldest_lot_date,
        COUNT(p.pack_id) FILTER (WHERE p.status = 'quarantine') AS quarantine_count
      FROM erp_packs p
      JOIN erp_items i ON i.item_code = p.item_code
      WHERE p.qty_remaining > 0 AND p.status != 'exhausted'
      GROUP BY p.item_code, i.item_name, i.item_category, i.uom, i.reorder_level, i.warehouse_zone
      ORDER BY i.item_category, i.item_name
    `
    return { success: true, data }
  })
}
