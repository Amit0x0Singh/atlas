/**
 * Microbial Inventory Routes — /api/erp/microbial/*
 * Containers with CFU decay model, transactions, allocation
 */
import prisma from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { writeAudit, auditUser } from '../middleware/audit.js'
import { createNotification } from '../services/notification-service.js'

const storeOrAbove = authorize(['store_person', 'store_manager', 'admin'])
const authOnly     = authorize(['store_person', 'store_manager', 'admin', 'planner', 'planning_manager'])

// ── CFU decay model ───────────────────────────────────────────────────────────
function calcCurrentCfu(mfgCfu, decayK, mfgDate) {
  const daysSince = (Date.now() - new Date(mfgDate).getTime()) / (1000 * 86400)
  return mfgCfu * Math.exp(-decayK * daysSince)
}

function containerStatus(currentCfu, mfgCfu, expiryDate) {
  const cfuRatio = currentCfu / mfgCfu
  const daysToExpiry = (new Date(expiryDate) - Date.now()) / (1000 * 86400)
  if (cfuRatio < 0.3 || daysToExpiry < 10) return 'at_risk'
  if (cfuRatio < 0.5 || daysToExpiry < 30) return 'watch'
  return 'healthy'
}

export default async function erpMicrobialRoutes(fastify) {

  // ─── GET /containers ──────────────────────────────────────────────────────
  fastify.get('/containers', { preHandler: authOnly }, async (req) => {
    const { strain_id, status } = req.query
    const containers = await prisma.$queryRaw`
      SELECT mc.*, ms.strain_name, ms.decay_k, ms.optimal_temp_c, ms.min_viable_cfu_per_ml
      FROM microbial_containers mc
      JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      WHERE (${strain_id || null}::uuid IS NULL OR mc.strain_id = ${strain_id || null}::uuid)
        AND (${status || null}::text IS NULL OR mc.status = ${status || null})
      ORDER BY mc.expiry_date ASC
    `
    // Compute live CFU for each container
    const enriched = containers.map(c => {
      const currentCfu = calcCurrentCfu(Number(c.mfg_cfu_per_ml), Number(c.decay_k), c.mfg_date)
      const computedStatus = containerStatus(currentCfu, Number(c.mfg_cfu_per_ml), c.expiry_date)
      return {
        ...c,
        current_cfu_per_ml: Number(currentCfu.toFixed(2)),
        cfu_ratio_pct: Number(((currentCfu / Number(c.mfg_cfu_per_ml)) * 100).toFixed(1)),
        days_to_expiry: Math.max(0, Math.floor((new Date(c.expiry_date) - Date.now()) / 86400000)),
        computed_status: computedStatus,
      }
    })
    return { success: true, data: enriched }
  })

  // ─── GET /containers/:id ──────────────────────────────────────────────────
  fastify.get('/containers/:id', { preHandler: authOnly }, async (req, reply) => {
    const rows = await prisma.$queryRaw`
      SELECT mc.*, ms.strain_name, ms.decay_k, ms.optimal_temp_c, ms.min_viable_cfu_per_ml
      FROM microbial_containers mc
      JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      WHERE mc.container_id = ${req.params.id}::uuid
    `
    if (!rows[0]) return reply.status(404).send({ success: false, error: 'Container not found' })
    const c = rows[0]
    const currentCfu = calcCurrentCfu(Number(c.mfg_cfu_per_ml), Number(c.decay_k), c.mfg_date)
    const transactions = await prisma.$queryRaw`
      SELECT * FROM microbial_transactions WHERE container_id = ${req.params.id}::uuid ORDER BY dispatch_date DESC
    `
    return {
      success: true,
      data: {
        ...c,
        current_cfu_per_ml: Number(currentCfu.toFixed(2)),
        cfu_ratio_pct: Number(((currentCfu / Number(c.mfg_cfu_per_ml)) * 100).toFixed(1)),
        days_to_expiry: Math.max(0, Math.floor((new Date(c.expiry_date) - Date.now()) / 86400000)),
        computed_status: containerStatus(currentCfu, Number(c.mfg_cfu_per_ml), c.expiry_date),
        transactions,
      },
    }
  })

  // ─── POST /containers ─────────────────────────────────────────────────────
  fastify.post('/containers', { preHandler: storeOrAbove }, async (req, reply) => {
    const { strain_id, location_room, location_position, volume_litres,
            mfg_cfu_per_ml, mfg_date, expiry_date, storage_temp_c, notes } = req.body || {}
    if (!strain_id || !volume_litres || !mfg_cfu_per_ml || !mfg_date || !expiry_date)
      return reply.status(400).send({ success: false, error: 'strain_id, volume_litres, mfg_cfu_per_ml, mfg_date, expiry_date required' })

    const rows = await prisma.$queryRaw`
      INSERT INTO microbial_containers (strain_id, location_room, location_position, volume_litres,
        mfg_cfu_per_ml, mfg_date, expiry_date, storage_temp_c, notes)
      VALUES (${strain_id}::uuid, ${location_room || null}, ${location_position || null},
              ${volume_litres}, ${mfg_cfu_per_ml}, ${mfg_date}::date, ${expiry_date}::date,
              ${storage_temp_c || null}, ${notes || null})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'microbial_containers', recordId: rows[0].container_id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  // ─── PATCH /containers/:id ────────────────────────────────────────────────
  fastify.patch('/containers/:id', { preHandler: storeOrAbove }, async (req, reply) => {
    const { location_room, location_position, storage_temp_c, status, notes } = req.body || {}
    await prisma.$executeRaw`
      UPDATE microbial_containers SET
        location_room    = COALESCE(${location_room || null}, location_room),
        location_position= COALESCE(${location_position || null}, location_position),
        storage_temp_c   = COALESCE(${storage_temp_c || null}, storage_temp_c),
        status           = COALESCE(${status || null}, status),
        notes            = COALESCE(${notes || null}, notes),
        updated_at       = NOW()
      WHERE container_id = ${req.params.id}::uuid
    `
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'microbial_containers', recordId: req.params.id, newValue: req.body })
    return { success: true, message: 'Container updated' }
  })

  // ─── POST /allocate — CFU allocation recommendation ───────────────────────
  fastify.post('/allocate', { preHandler: authOnly }, async (req, reply) => {
    const { strain_id, cfu_demand, required_cfu_per_ml, volume_litres } = req.body || {}
    if (!strain_id) return reply.status(400).send({ success: false, error: 'strain_id required' })

    // Calculate CFU demand if not explicitly provided
    const totalCfuDemand = cfu_demand
      ? Number(cfu_demand)
      : (Number(required_cfu_per_ml || 1e8) * Number(volume_litres || 1) * 1000 * 1.20)

    const containers = await prisma.$queryRaw`
      SELECT mc.*, ms.decay_k FROM microbial_containers mc
      JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      WHERE mc.strain_id = ${strain_id}::uuid
        AND mc.status IN ('healthy','watch')
        AND mc.expiry_date > NOW()
      ORDER BY mc.mfg_date DESC
    `

    let cfuMet = 0
    const allocation = []
    for (const c of containers) {
      if (cfuMet >= totalCfuDemand) break
      const currentCfu = calcCurrentCfu(Number(c.mfg_cfu_per_ml), Number(c.decay_k), c.mfg_date)
      const cfuPerContainer = currentCfu * Number(c.volume_litres) * 1000
      const cfuStillNeeded = totalCfuDemand - cfuMet
      const volumeToUse = Math.min(Number(c.volume_litres), cfuStillNeeded / (currentCfu * 1000))
      const cfuContrib = currentCfu * volumeToUse * 1000
      cfuMet += cfuContrib
      allocation.push({
        container_id: c.container_id,
        location: `${c.location_room || ''} ${c.location_position || ''}`.trim(),
        current_cfu_per_ml: Number(currentCfu.toFixed(2)),
        volume_litres: Number(c.volume_litres),
        volume_to_use: Number(volumeToUse.toFixed(3)),
        cfu_contribution: cfuContrib.toExponential(2),
        expiry_date: c.expiry_date,
      })
    }

    return {
      success: true,
      data: {
        cfu_demand: totalCfuDemand.toExponential(2),
        cfu_allocated: cfuMet.toExponential(2),
        sufficient: cfuMet >= totalCfuDemand,
        allocation,
      },
    }
  })

  // ─── POST /transactions — record dispatch ─────────────────────────────────
  fastify.post('/transactions', { preHandler: storeOrAbove }, async (req, reply) => {
    const { container_id, job_id, volume_dispatched_l, cfu_per_ml_at_dispatch,
            dispatch_temp_c, receiver_name, dispatch_notes } = req.body || {}
    if (!container_id || !volume_dispatched_l || !receiver_name)
      return reply.status(400).send({ success: false, error: 'container_id, volume_dispatched_l, receiver_name required' })

    const container = await prisma.$queryRaw`
      SELECT mc.*, ms.decay_k FROM microbial_containers mc
      JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      WHERE mc.container_id = ${container_id}::uuid
    `
    if (!container[0]) return reply.status(404).send({ success: false, error: 'Container not found' })

    const currentCfu = calcCurrentCfu(Number(container[0].mfg_cfu_per_ml), Number(container[0].decay_k), container[0].mfg_date)

    const rows = await prisma.$queryRaw`
      INSERT INTO microbial_transactions (container_id, job_id, volume_dispatched_l,
        cfu_per_ml_at_dispatch, dispatch_temp_c, dispatched_by, receiver_name)
      VALUES (${container_id}::uuid, ${job_id || null}::uuid, ${volume_dispatched_l},
              ${cfu_per_ml_at_dispatch || Number(currentCfu.toFixed(2))},
              ${dispatch_temp_c || null}, ${req.user?.user_id || null}::uuid, ${receiver_name})
      RETURNING *
    `

    await writeAudit({ ...auditUser(req), action: 'DISPATCH', tableName: 'microbial_transactions', recordId: rows[0].id, newValue: req.body })
    return reply.status(201).send({ success: true, data: rows[0] })
  })

  // ─── PATCH /transactions/:id/confirm-receipt ──────────────────────────────
  fastify.patch('/transactions/:id/confirm-receipt', { preHandler: authenticate }, async (req, reply) => {
    const { actual_cfu_on_receipt, receipt_notes } = req.body || {}
    await prisma.$executeRaw`
      UPDATE microbial_transactions SET
        receipt_confirmed = true, receipt_confirmed_at = NOW(),
        actual_cfu_on_receipt = ${actual_cfu_on_receipt || null},
        receipt_notes = ${receipt_notes || null}
      WHERE id = ${req.params.id}::uuid
    `
    await writeAudit({ ...auditUser(req), action: 'CONFIRM_RECEIPT', tableName: 'microbial_transactions', recordId: req.params.id })
    return { success: true, message: 'Receipt confirmed' }
  })

  // ─── GET /transactions ────────────────────────────────────────────────────
  fastify.get('/transactions', { preHandler: authOnly }, async (req) => {
    const { container_id, unconfirmed_only, limit = 100, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT mt.*, ms.strain_name, u.full_name AS dispatched_by_name
      FROM microbial_transactions mt
      JOIN microbial_containers mc ON mc.container_id = mt.container_id
      JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      LEFT JOIN users u ON u.user_id = mt.dispatched_by
      WHERE (${container_id || null}::uuid IS NULL OR mt.container_id = ${container_id || null}::uuid)
        AND (${unconfirmed_only === 'true' ? true : null}::boolean IS NULL OR mt.receipt_confirmed = false)
      ORDER BY mt.dispatch_date DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return { success: true, data }
  })

  // ─── GET /decay-report — CFU decay for all containers ────────────────────
  fastify.get('/decay-report', { preHandler: authOnly }, async () => {
    const containers = await prisma.$queryRaw`
      SELECT mc.container_id, mc.mfg_cfu_per_ml, mc.mfg_date, mc.expiry_date,
             mc.volume_litres, mc.location_room, mc.status,
             ms.strain_name, ms.decay_k
      FROM microbial_containers mc
      JOIN microbial_strains ms ON ms.strain_id = mc.strain_id
      WHERE mc.status != 'exhausted'
      ORDER BY mc.expiry_date ASC
    `
    const today = new Date()
    const report = containers.map(c => {
      const days = (today - new Date(c.mfg_date)) / 86400000
      const currentCfu = Number(c.mfg_cfu_per_ml) * Math.exp(-Number(c.decay_k) * days)
      const halfLife = Math.log(2) / Number(c.decay_k)
      const projections = [7, 14, 30, 60, 90].map(d => ({
        days_from_now: d,
        projected_cfu: Number((Number(c.mfg_cfu_per_ml) * Math.exp(-Number(c.decay_k) * (days + d))).toFixed(2)),
      }))
      return {
        ...c,
        current_cfu_per_ml: Number(currentCfu.toFixed(2)),
        cfu_ratio_pct: Number(((currentCfu / Number(c.mfg_cfu_per_ml)) * 100).toFixed(1)),
        days_since_mfg: Math.floor(days),
        days_to_expiry: Math.max(0, Math.floor((new Date(c.expiry_date) - today) / 86400000)),
        half_life_days: Number(halfLife.toFixed(1)),
        projections,
        computed_status: containerStatus(currentCfu, Number(c.mfg_cfu_per_ml), c.expiry_date),
      }
    })
    return { success: true, data: report }
  })
}
