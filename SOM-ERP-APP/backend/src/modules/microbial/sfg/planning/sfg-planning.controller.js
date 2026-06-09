import prisma from '../../../../db.js'
import { createNotification } from '../../../../services/notification-service.js'

export async function checkPlanMicrobes(req, res) {
  try {
    const { planId } = req.params
    const mf = parseFloat(req.query.multiplication_factor) || 1
    const plans = await prisma.$queryRaw`SELECT plan_id, product_code, product_name, total_qty, sales_order_item_id FROM production_plan WHERE plan_id = ${planId}`
    const plan = plans[0]
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' })
    const recipe = await prisma.$queryRaw`
      SELECT r.*, mm.microbe_id, mm.microbe_name AS master_microbe_name
      FROM recipe_db r LEFT JOIN microbe_master mm ON mm.microbe_code = r.microbe_code
      WHERE r.product_code = ${plan.product_code} AND r.is_microbe = true
    `
    if (!recipe.length) return res.json({ success: true, has_microbes: false, microbes: [], plan })
    const microbeData = []
    for (const rec of recipe) {
      const requiredCfuPerG = Number(rec.required_cfu || 0)
      const orderQtyKg = Number(plan.total_qty || 0)
      const sfgReqKg = requiredCfuPerG > 0 ? (mf * requiredCfuPerG * orderQtyKg) : null
      const stock = await prisma.$queryRaw`
        SELECT i.inward_id, i.microbe_code, i.microbe_name, i.microbe_type, i.container_code, i.container_id,
               i.inhouse_cfu_per_g, i.remaining_qty_kg, i.biomass_batch_code, i.date_of_harvest, i.location, i.moisture, i.shelf_life_days,
               c.fill_status AS container_fill_status, c.location AS container_location
        FROM microbial_sfg_inward i JOIN microbial_sfg_container c ON c.container_id = i.container_id
        WHERE (i.microbe_code = ${rec.microbe_code || null} OR LOWER(i.microbe_name) = LOWER(${rec.rm_name || ''}))
          AND i.status = 'ACTIVE' AND i.remaining_qty_kg > 0
        ORDER BY i.date_of_harvest ASC, i.created_at ASC
      `
      const byType = {}
      for (const s of stock) {
        const t = s.microbe_type
        if (!byType[t]) byType[t] = { microbe_type: t, batches: [], total_available_kg: 0, avg_cfu_per_g: 0 }
        const inhouseCfu = Number(s.inhouse_cfu_per_g)
        const reqKg = inhouseCfu > 0 && requiredCfuPerG > 0 ? (mf * requiredCfuPerG * orderQtyKg) / inhouseCfu : sfgReqKg
        byType[t].batches.push({ ...s, remaining_qty_kg: Number(s.remaining_qty_kg), inhouse_cfu_per_g: inhouseCfu, required_qty_kg: reqKg ? Number(reqKg.toFixed(3)) : null })
        byType[t].total_available_kg += Number(s.remaining_qty_kg)
      }
      for (const t of Object.keys(byType)) {
        const g = byType[t]
        const totalQty = g.batches.reduce((s, b) => s + b.remaining_qty_kg, 0)
        g.avg_cfu_per_g = totalQty > 0 ? g.batches.reduce((s, b) => s + b.inhouse_cfu_per_g * b.remaining_qty_kg, 0) / totalQty : 0
        g.total_available_kg = Number(g.total_available_kg.toFixed(3))
        g.avg_cfu_per_g = Number(g.avg_cfu_per_g.toFixed(2))
        g.required_qty_kg = requiredCfuPerG > 0 && g.avg_cfu_per_g > 0 ? Number(((mf * requiredCfuPerG * orderQtyKg) / g.avg_cfu_per_g).toFixed(3)) : null
        g.is_sufficient = g.required_qty_kg != null ? g.total_available_kg >= g.required_qty_kg : null
      }
      microbeData.push({ rm_code: rec.rm_code, rm_name: rec.rm_name, microbe_code: rec.microbe_code, qty_per_unit: Number(rec.qty_per_unit), required_cfu_per_g: requiredCfuPerG, order_qty_kg: orderQtyKg, types: Object.values(byType) })
    }
    return res.json({ success: true, has_microbes: true, plan: { ...plan, total_qty: Number(plan.total_qty) }, multiplication_factor: mf, microbes: microbeData })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function allocateSfg(req, res) {
  try {
    const { plan_id, microbe_code, microbe_name, microbe_type, multiplication_factor, required_cfu_per_g, order_qty_kg, picks } = req.body || {}
    if (!plan_id || !picks?.length) return res.status(400).json({ success: false, error: 'plan_id and picks[] required' })
    const results = []
    for (const pick of picks) {
      const { inward_id, container_code, inhouse_cfu_per_g, qty_kg } = pick
      const updated = await prisma.$queryRaw`
        UPDATE microbial_sfg_inward
        SET remaining_qty_kg = remaining_qty_kg - ${Number(qty_kg)},
            status = CASE WHEN remaining_qty_kg - ${Number(qty_kg)} <= 0 THEN 'EXHAUSTED' ELSE 'ACTIVE' END,
            updated_at = NOW()
        WHERE inward_id = ${inward_id} AND remaining_qty_kg >= ${Number(qty_kg)}
        RETURNING *
      `
      if (!updated[0]) return res.status(409).json({ success: false, error: `Insufficient stock in batch ${inward_id}` })
      await prisma.$executeRaw`
        UPDATE microbial_sfg_container SET current_qty_kg = GREATEST(0, current_qty_kg - ${Number(qty_kg)}), fill_status = CASE WHEN current_qty_kg - ${Number(qty_kg)} <= 0 THEN 'EMPTY' ELSE 'PARTIAL' END, updated_at = NOW() WHERE container_id = ${updated[0].container_id}
      `
      const alloc = await prisma.$queryRaw`
        INSERT INTO microbial_sfg_allocation (plan_id, inward_id, container_code, microbe_code, microbe_name, microbe_type, allocated_qty_kg, multiplication_factor, required_cfu_per_g, inhouse_cfu_per_g, order_qty_kg)
        VALUES (${plan_id}, ${inward_id}, ${container_code || null}, ${microbe_code || null}, ${microbe_name || null}, ${microbe_type || null}, ${Number(qty_kg)}, ${Number(multiplication_factor || 1)}, ${Number(required_cfu_per_g || 0)}, ${Number(inhouse_cfu_per_g || 0)}, ${Number(order_qty_kg || 0)})
        RETURNING *
      `
      results.push(alloc[0])
    }
    try {
      const picksText = picks.map(p => `• ${p.qty_kg} kg from container ${p.container_code} (Batch: ${p.inward_id?.slice(-8)})`).join('\n')
      await createNotification({ type: 'MICROBIAL_PICK', title: `Cold Room Pick — Plan ${plan_id}`, message: `Please pick the following microbial SFG for Plan ${plan_id} (${microbe_name || microbe_code} — ${microbe_type}):\n${picksText}`, targetRole: 'store_person', metadata: { plan_id, microbe_code, microbe_type, picks } })
    } catch (_) {}
    return res.status(201).json({ success: true, data: results })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getAllocationsForPlan(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT a.*, i.biomass_batch_code, i.date_of_harvest, i.location AS batch_location
      FROM microbial_sfg_allocation a LEFT JOIN microbial_sfg_inward i ON i.inward_id = a.inward_id
      WHERE a.plan_id = ${req.params.planId}
      ORDER BY a.created_at ASC
    `
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function cancelAllocation(req, res) {
  try {
    const rows = await prisma.$queryRaw`SELECT * FROM microbial_sfg_allocation WHERE allocation_id = ${req.params.id}`
    const alloc = rows[0]
    if (!alloc) return res.status(404).json({ success: false, error: 'Allocation not found' })
    if (alloc.status === 'PICKED') return res.status(409).json({ success: false, error: 'Cannot cancel a PICKED allocation' })
    await prisma.$executeRaw`UPDATE microbial_sfg_inward SET remaining_qty_kg = remaining_qty_kg + ${Number(alloc.allocated_qty_kg)}, status = 'ACTIVE', updated_at = NOW() WHERE inward_id = ${alloc.inward_id}`
    await prisma.$executeRaw`UPDATE microbial_sfg_container SET current_qty_kg = current_qty_kg + ${Number(alloc.allocated_qty_kg)}, fill_status = 'PARTIAL', updated_at = NOW() WHERE container_code = ${alloc.container_code}`
    await prisma.$executeRaw`DELETE FROM microbial_sfg_allocation WHERE allocation_id = ${req.params.id}`
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
