import prisma from '../../db.js'
import { writeAudit, auditUser } from '../../middleware/audit.js'
import { createNotification } from '../../services/notification-service.js'

export async function analyseOrder(req, res) {
  try {
    const { di_number, horizon_days = 3 } = req.body || {}
    if (!di_number) return res.status(400).json({ success: false, error: 'di_number required' })
    const order = await prisma.$queryRaw`
      SELECT so.*, ep.is_microbial, ep.microbial_strain_id, ep.consolidation_window_days,
             ep.plant_id, ep.shelf_life_days, ep.status AS product_status
      FROM sales_orders so LEFT JOIN erp_products ep ON ep.product_code = so.product_code
      WHERE so.di_number = ${di_number}
    `
    if (!order[0]) return res.status(404).json({ success: false, error: 'Sales order not found' })
    const o = order[0]
    if (o.status !== 'confirmed') return res.status(400).json({ success: false, error: `Order must be confirmed. Current status: ${o.status}` })
    const analysis = {}

    const fgPacks = await prisma.$queryRaw`SELECT SUM(qty_remaining) AS total_fg FROM erp_packs p JOIN erp_items i ON i.item_code = p.item_code WHERE i.item_code = ${o.product_code} AND p.status IN ('active','partial') AND p.qr_confirmed = true`
    const fgStock = Number(fgPacks[0]?.total_fg || 0)
    analysis.step1_fg = { available_fg: fgStock, order_qty: Number(o.order_qty), can_fulfil_from_fg: fgStock >= Number(o.order_qty), suggestion: fgStock >= Number(o.order_qty) ? `Fulfilled from FG stock (${fgStock} available). No production needed.` : `FG stock insufficient (${fgStock} / ${o.order_qty}). Production required.` }

    const consolidationDays = Number(o.consolidation_window_days || 3)
    const etdTo = new Date(new Date(o.etd).getTime() + consolidationDays * 86400000).toISOString().slice(0, 10)
    const consolidatableOrders = await prisma.$queryRaw`SELECT di_number, order_qty, qty_unit, etd FROM sales_orders WHERE product_code = ${o.product_code} AND status = 'confirmed' AND di_number != ${di_number} AND etd BETWEEN ${o.etd}::date AND ${etdTo}::date`
    analysis.step2_consolidation = { consolidatable_orders: consolidatableOrders, suggestion: consolidatableOrders.length ? `Can combine with ${consolidatableOrders.map(x => x.di_number).join(', ')} (ETD within ${consolidationDays} days).` : 'No other orders to consolidate.' }

    const bom = await prisma.$queryRaw`SELECT * FROM bom_headers WHERE product_code = ${o.product_code} AND status = 'active' ORDER BY effective_date DESC LIMIT 1`
    if (!bom[0]) {
      analysis.step3_rm = { error: 'No active BOM found for this product' }
    } else {
      const yieldFactor = Number(bom[0].yield_pct) / 100
      const requiredQty = Number(o.order_qty) / yieldFactor
      const formLines = await prisma.$queryRaw`SELECT f.*, i.item_name, i.uom, i.reorder_level FROM bom_lines_formulation f JOIN erp_items i ON i.item_code = f.item_code WHERE f.bom_id = ${bom[0].bom_id}::uuid`
      const packLines = await prisma.$queryRaw`SELECT p.*, i.item_name, i.uom FROM bom_lines_packing p JOIN erp_items i ON i.item_code = p.item_code WHERE p.bom_id = ${bom[0].bom_id}::uuid`
      const allLines = [...formLines, ...packLines]
      const rmCheck = []
      let anyShort = false
      for (const line of allLines) {
        const needed = Number(line.qty_per_unit) * requiredQty
        const stock = await prisma.$queryRaw`SELECT COALESCE(SUM(qty_remaining),0) AS avail FROM erp_packs WHERE item_code = ${line.item_code} AND qr_confirmed = true AND status IN ('active','partial')`
        const available = Number(stock[0].avail)
        const statusColor = available >= needed ? 'green' : available >= needed * 0.5 ? 'amber' : 'red'
        if (statusColor !== 'green') anyShort = true
        rmCheck.push({ item_code: line.item_code, item_name: line.item_name, needed: Number(needed.toFixed(4)), available, shortage: Math.max(0, needed - available), status: statusColor, is_critical: line.is_critical || false, line_type: formLines.includes(line) ? 'formulation' : 'packing' })
      }
      analysis.step3_rm = { bom_id: bom[0].bom_id, bom_version: bom[0].bom_version, yield_pct: bom[0].yield_pct, required_qty: requiredQty, lines: rmCheck, any_short: anyShort }
      analysis.bom_id = bom[0].bom_id; analysis.bom_version = bom[0].bom_version
    }

    if (o.is_microbial && o.microbial_strain_id) {
      const strain = await prisma.$queryRaw`SELECT * FROM microbial_strains WHERE strain_id = ${o.microbial_strain_id}::uuid`
      const containers = await prisma.$queryRaw`SELECT mc.*, ms.decay_k FROM microbial_containers mc JOIN microbial_strains ms ON ms.strain_id = mc.strain_id WHERE mc.strain_id = ${o.microbial_strain_id}::uuid AND mc.status IN ('healthy','watch') AND mc.expiry_date > NOW() ORDER BY mc.mfg_date DESC`
      const minCfu = Number(strain[0]?.min_viable_cfu_per_ml || 1e8)
      const cfuDemand = minCfu * Number(o.order_qty) * 1000 * 1.20
      let cfuTotal = 0
      const allocation = []
      for (const c of containers) {
        if (cfuTotal >= cfuDemand) break
        const daysSince = (Date.now() - new Date(c.mfg_date).getTime()) / 86400000
        const currentCfu = Number(c.mfg_cfu_per_ml) * Math.exp(-Number(c.decay_k) * daysSince)
        const useVol = Math.min(Number(c.volume_litres), (cfuDemand - cfuTotal) / (currentCfu * 1000))
        cfuTotal += currentCfu * useVol * 1000
        allocation.push({ container_id: c.container_id, current_cfu_per_ml: currentCfu.toFixed(2), volume_to_use: useVol.toFixed(3), cfu_contribution: (currentCfu * useVol * 1000).toExponential(2) })
      }
      analysis.step4_microbial = { cfu_demand: cfuDemand.toExponential(2), cfu_available: cfuTotal.toExponential(2), sufficient: cfuTotal >= cfuDemand, allocation }
    } else {
      analysis.step4_microbial = { applicable: false }
    }

    if (o.plant_id) {
      const equipment = await prisma.$queryRaw`SELECT e.* FROM erp_equipment e WHERE e.plant_id = ${o.plant_id}::uuid AND e.status = 'active' ORDER BY e.working_volume DESC LIMIT 1`
      if (equipment[0]) {
        const eq = equipment[0]
        const conflictJobs = await prisma.$queryRaw`SELECT pj.job_id, pj.batch_code, pj.expected_start_time, pj.expected_end_time FROM production_jobs pj WHERE pj.equipment_id = ${eq.equipment_id}::uuid AND pj.status IN ('pending','in_progress') AND pj.expected_end_time > NOW() ORDER BY pj.expected_start_time ASC LIMIT 3`
        analysis.step5_equipment = { equipment_id: eq.equipment_id, equipment_name: eq.equipment_name, working_volume: eq.working_volume, working_volume_unit: eq.working_volume_unit, cleaning_time_hrs: eq.cleaning_time_hrs, conflicts: conflictJobs, next_available: conflictJobs[0]?.expected_end_time || 'Now' }
        analysis.equipment_id = eq.equipment_id
        const workVol = Number(eq.working_volume || o.order_qty)
        const batchCount = Math.ceil(Number(o.order_qty) / workVol)
        analysis.step6_batches = { batch_count: batchCount, qty_per_batch: (Number(o.order_qty) / batchCount).toFixed(3), working_volume: workVol }
        const tmm = await prisma.$queryRaw`SELECT * FROM time_motion_model WHERE product_code = ${o.product_code} AND equipment_id = ${eq.equipment_id}::uuid`
        if (tmm.length) {
          const totalMins = tmm.reduce((sum, row) => sum + Number(row.avg_mins_per_unit) * Number(o.order_qty), 0)
          analysis.step7_time_motion = { estimate_hrs: (totalMins / 60).toFixed(1), stages: tmm.map(r => ({ stage: r.operation_stage, avg_mins_per_unit: r.avg_mins_per_unit, confidence: r.confidence, observations: Number(r.observation_count) })) }
        } else {
          analysis.step7_time_motion = { estimate_hrs: null, message: 'No time-motion data available yet' }
        }
      } else {
        analysis.step5_equipment = { error: 'No active equipment found for this plant' }
      }
    } else {
      analysis.step5_equipment = { error: 'No plant assigned to product' }
    }

    return res.json({ success: true, data: { order: o, analysis } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createPlan(req, res) {
  try {
    const { di_number, product_code, bom_id, bom_version, planned_qty, equipment_id, batch_count, planned_start_date, planned_end_date, fg_stock_used, consolidation_group, is_urgent, urgent_reason } = req.body || {}
    if (!di_number || !product_code || !bom_id || !planned_qty || !equipment_id || !batch_count)
      return res.status(400).json({ success: false, error: 'di_number, product_code, bom_id, planned_qty, equipment_id, batch_count required' })
    if (is_urgent && req.user?.role === 'planner')
      return res.status(403).json({ success: false, error: 'Urgent orders can only be inserted by planning_manager' })
    const bom = await prisma.$queryRaw`SELECT bom_id, bom_version FROM bom_headers WHERE bom_id = ${bom_id}::uuid`
    if (!bom[0]) return res.status(404).json({ success: false, error: 'BOM not found' })
    const plan = await prisma.$queryRaw`
      INSERT INTO production_plans (di_number, product_code, bom_id, bom_version, planned_qty, equipment_id, batch_count, planned_start_date, planned_end_date, fg_stock_used, consolidation_group, is_urgent, urgent_reason, status, created_by)
      VALUES (${di_number}, ${product_code}, ${bom_id}::uuid, ${bom[0].bom_version}, ${planned_qty}, ${equipment_id}::uuid, ${batch_count}, ${planned_start_date || null}::date, ${planned_end_date || null}::date, ${fg_stock_used || 0}, ${consolidation_group || null}, ${is_urgent || false}, ${urgent_reason || null}, 'draft', ${req.user?.user_id || null}::uuid)
      RETURNING *
    `
    const planId = plan[0].plan_id
    const qtyPerBatch = Number(planned_qty) / Number(batch_count)
    const jobs = []
    for (let i = 1; i <= Number(batch_count); i++) {
      const job = await prisma.$queryRaw`INSERT INTO production_jobs (plan_id, batch_no, batch_code, product_code, equipment_id, batch_qty, status) VALUES (${planId}::uuid, ${i}, ${`${product_code}-BATCH-${String(i).padStart(2, '0')}`}, ${product_code}, ${equipment_id}::uuid, ${qtyPerBatch}, 'pending') RETURNING *`
      jobs.push(job[0])
    }
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'production_plans', recordId: planId, newValue: req.body })
    return res.status(201).json({ success: true, data: { ...plan[0], jobs } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listErpPlans(req, res) {
  try {
    const { status, product_code, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT pp.*, so.customer_name, so.etd, so.priority, u1.full_name AS created_by_name, u2.full_name AS published_by_name
      FROM production_plans pp LEFT JOIN sales_orders so ON so.di_number = pp.di_number
      LEFT JOIN users u1 ON u1.user_id = pp.created_by LEFT JOIN users u2 ON u2.user_id = pp.published_by
      WHERE (${status || null}::text IS NULL OR pp.status = ${status || null})
        AND (${product_code || null}::text IS NULL OR pp.product_code = ${product_code || null})
      ORDER BY pp.created_at DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getErpPlan(req, res) {
  try {
    const plan = await prisma.$queryRaw`SELECT * FROM production_plans WHERE plan_id = ${req.params.id}::uuid`
    if (!plan[0]) return res.status(404).json({ success: false, error: 'Plan not found' })
    const jobs = await prisma.$queryRaw`SELECT pj.*, ee.equipment_name FROM production_jobs pj LEFT JOIN erp_equipment ee ON ee.equipment_id = pj.equipment_id WHERE pj.plan_id = ${req.params.id}::uuid ORDER BY pj.batch_no`
    return res.json({ success: true, data: { ...plan[0], jobs } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function submitPlan(req, res) {
  try {
    const plan = await prisma.$queryRaw`SELECT * FROM production_plans WHERE plan_id = ${req.params.id}::uuid`
    if (!plan[0]) return res.status(404).json({ success: false, error: 'Plan not found' })
    if (plan[0].status !== 'draft') return res.status(400).json({ success: false, error: 'Only draft plans can be submitted' })
    await prisma.$executeRaw`UPDATE production_plans SET status = 'submitted', submitted_by = ${req.user?.user_id || null}::uuid, submitted_at = NOW(), updated_at = NOW() WHERE plan_id = ${req.params.id}::uuid`
    await writeAudit({ ...auditUser(req), action: 'SUBMIT', tableName: 'production_plans', recordId: req.params.id })
    return res.json({ success: true, message: 'Plan submitted for planning manager review' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function publishPlan(req, res) {
  try {
    const plan = await prisma.$queryRaw`SELECT * FROM production_plans WHERE plan_id = ${req.params.id}::uuid`
    if (!plan[0]) return res.status(404).json({ success: false, error: 'Plan not found' })
    if (plan[0].status !== 'submitted') return res.status(400).json({ success: false, error: 'Only submitted plans can be published' })
    await prisma.$executeRaw`UPDATE production_plans SET status = 'published', published_by = ${req.user?.user_id || null}::uuid, published_at = NOW(), updated_at = NOW() WHERE plan_id = ${req.params.id}::uuid`
    await prisma.$executeRaw`UPDATE sales_orders SET status = 'planned', updated_at = NOW() WHERE di_number = ${plan[0].di_number}`
    const jobs = await prisma.$queryRaw`SELECT * FROM production_jobs WHERE plan_id = ${req.params.id}::uuid ORDER BY batch_no`
    await createNotification({ type: 'bom_published', title: `Production Plan Published: ${plan[0].product_code}`, message: `BOM issued for ${plan[0].product_code}, ${jobs.length} batches planned. Action required for material issuance.`, targetRole: 'store_person', refType: 'production_plan', refId: plan[0].plan_id })
    await createNotification({ type: 'bom_published', title: `Production Plan Published: ${plan[0].product_code}`, message: `Production plan published for ${plan[0].product_code}, ${jobs.length} batches.`, targetRole: 'plant_supervisor', refType: 'production_plan', refId: plan[0].plan_id })
    if (plan[0].is_urgent) await createNotification({ type: 'urgent_order', title: `URGENT Production Plan: ${plan[0].product_code}`, message: `Urgent production order inserted: ${plan[0].product_code}. Reason: ${plan[0].urgent_reason || 'not specified'}`, targetRole: 'plant_supervisor', refType: 'production_plan', refId: plan[0].plan_id })
    await writeAudit({ ...auditUser(req), action: 'PUBLISH', tableName: 'production_plans', recordId: req.params.id })
    return res.json({ success: true, message: 'Plan published. Plant and store teams notified.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function startJob(req, res) {
  try {
    await prisma.$executeRaw`UPDATE production_jobs SET status = 'in_progress', actual_start_time = NOW(), updated_at = NOW() WHERE job_id = ${req.params.id}::uuid AND status = 'pending'`
    const job = await prisma.$queryRaw`SELECT plan_id FROM production_jobs WHERE job_id = ${req.params.id}::uuid`
    if (job[0]) {
      await prisma.$executeRaw`UPDATE production_plans SET status = 'in_production', updated_at = NOW() WHERE plan_id = ${job[0].plan_id}::uuid AND status = 'published'`
      await prisma.$executeRaw`UPDATE sales_orders SET status = 'in_production', updated_at = NOW() WHERE di_number = (SELECT di_number FROM production_plans WHERE plan_id = ${job[0].plan_id}::uuid)`
    }
    await writeAudit({ ...auditUser(req), action: 'START', tableName: 'production_jobs', recordId: req.params.id })
    return res.json({ success: true, message: 'Batch started' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function delayJob(req, res) {
  try {
    const { delay_reason_code, delay_notes } = req.body || {}
    if (!delay_reason_code) return res.status(400).json({ success: false, error: 'delay_reason_code required' })
    await prisma.$executeRaw`UPDATE production_jobs SET delay_reason_code = ${delay_reason_code}, delay_notes = ${delay_notes || null}, updated_at = NOW() WHERE job_id = ${req.params.id}::uuid`
    await writeAudit({ ...auditUser(req), action: 'DELAY', tableName: 'production_jobs', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Delay reason logged' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function recordQc(req, res) {
  try {
    const { result, cfu_count, moisture_pct, ph_value, notes, action_taken } = req.body || {}
    if (!result) return res.status(400).json({ success: false, error: 'result required (pass/fail/hold)' })
    const qc = await prisma.$queryRaw`
      INSERT INTO batch_qc_records (job_id, qc_person_id, result, cfu_count, moisture_pct, ph_value, notes, action_taken)
      VALUES (${req.params.id}::uuid, ${req.user?.user_id || null}::uuid, ${result}, ${cfu_count || null}, ${moisture_pct || null}, ${ph_value || null}, ${notes || null}, ${action_taken || null})
      RETURNING *
    `
    if (result === 'pass') await prisma.$executeRaw`UPDATE production_jobs SET status = 'qc_passed', actual_end_time = NOW(), updated_at = NOW() WHERE job_id = ${req.params.id}::uuid`
    else if (result === 'fail') await prisma.$executeRaw`UPDATE production_jobs SET status = 'qc_failed', actual_end_time = NOW(), updated_at = NOW() WHERE job_id = ${req.params.id}::uuid`
    await writeAudit({ ...auditUser(req), action: 'QC_RECORD', tableName: 'batch_qc_records', recordId: qc[0].qc_id, newValue: req.body })
    return res.status(201).json({ success: true, data: qc[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function logTimeMotion(req, res) {
  try {
    const { product_code, equipment_id, operation_stage, qty_produced, time_hrs, workers_deployed, shift, notes } = req.body || {}
    if (!product_code || !operation_stage || !qty_produced || !time_hrs) return res.status(400).json({ success: false, error: 'product_code, operation_stage, qty_produced, time_hrs required' })
    const rows = await prisma.$queryRaw`
      INSERT INTO time_motion_logs (product_code, equipment_id, operation_stage, qty_produced, time_hrs, workers_deployed, shift, supervisor_id, notes)
      VALUES (${product_code}, ${equipment_id || null}::uuid, ${operation_stage}, ${qty_produced}, ${time_hrs}, ${workers_deployed || null}, ${shift || null}, ${req.user?.user_id || null}::uuid, ${notes || null})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'time_motion_logs', recordId: rows[0].id, newValue: req.body })
    return res.status(201).json({ success: true, data: rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listTimeMotion(req, res) {
  try {
    const { product_code, equipment_id } = req.query
    const data = await prisma.$queryRaw`
      SELECT tmm.*, ep.product_name, ee.equipment_name
      FROM time_motion_model tmm
      LEFT JOIN erp_products ep ON ep.product_code = tmm.product_code
      LEFT JOIN erp_equipment ee ON ee.equipment_id = tmm.equipment_id
      WHERE (${product_code || null}::text IS NULL OR tmm.product_code = ${product_code || null})
        AND (${equipment_id || null}::uuid IS NULL OR tmm.equipment_id = ${equipment_id || null}::uuid)
      ORDER BY tmm.product_code, tmm.operation_stage
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
