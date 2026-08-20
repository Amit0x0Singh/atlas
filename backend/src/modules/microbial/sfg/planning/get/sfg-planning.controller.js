import prisma from '../../../../../db.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js'

export const checkPlanMicrobes = async (req, res) => {
  try {
    const { planId } = req.params
    const mf = parseFloat(req.query.multiplication_factor) || 1

    const plan = await prisma.productionPlan.findUnique({
      where: { planId },
      select: { planId: true, productCode: true, productName: true, totalQty: true, salesOrderItemId: true },
    })
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found', code: 'NOT_FOUND' })

    const recipe = await prisma.recipeDb.findMany({
      where: { productCode: plan.productCode, isMicrobe: true },
    })
    if (!recipe.length) return res.json({ success: true, has_microbes: false, microbes: [], plan })

    const microbeData = []
    for (const rec of recipe) {
      const requiredCfuPerG = Number(rec.requiredCfu || 0)
      const orderQtyKg = Number(plan.totalQty || 0)
      const sfgReqKg = requiredCfuPerG > 0 ? (mf * requiredCfuPerG * orderQtyKg) : null

      const orFilters = []
      if (rec.microbeCode) orFilters.push({ microbeCode: rec.microbeCode })
      if (rec.rmName)      orFilters.push({ microbeName: { equals: rec.rmName, mode: 'insensitive' } })

      const stock = await (orFilters.length
        ? prisma.microbialSfgInward.findMany({
            where:   { OR: orFilters, status: 'ACTIVE', remainingQtyKg: { gt: 0 } },
            include: { container: { select: { fillStatus: true, location: true } } },
            orderBy: [{ dateOfHarvest: 'asc' }, { createdAt: 'asc' }],
          })
        : Promise.resolve([])
      )

      // Flatten to match original shape used below
      const stockFlat = stock.map(i => ({
        inward_id:               i.inwardId,
        microbe_code:            i.microbeCode,
        microbe_name:            i.microbeName,
        microbe_type:            i.microbeType,
        container_code:          i.containerCode,
        container_id:            i.containerId,
        inhouse_cfu_per_g:       i.inhouseCfuPerG,
        remaining_qty_kg:        i.remainingQtyKg,
        biomass_batch_code:      i.biomassBatchCode,
        date_of_harvest:         i.dateOfHarvest,
        location:                i.location,
        moisture:                i.moisture,
        shelf_life_days:         i.shelfLifeDays,
        container_fill_status:   i.container?.fillStatus  ?? null,
        container_location:      i.container?.location    ?? null,
      }))

      const byType = {}
      for (const s of stockFlat) {
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

      microbeData.push({
        rm_code: rec.rmCode,
        rm_name: rec.rmName,
        microbe_code: rec.microbeCode,
        qty_per_unit: Number(rec.qtyPerUnit),
        required_cfu_per_g: requiredCfuPerG,
        order_qty_kg: orderQtyKg,
        types: Object.values(byType),
      })
    }

    return res.json({
      success: true,
      has_microbes: true,
      plan: { ...plan, total_qty: Number(plan.totalQty) },
      multiplication_factor: mf,
      microbes: microbeData,
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Auto-detects which lines of a product's recipe are actually microbes (by
// matching the recipe line's ingredient name against Microbe Master — no
// recipe rows currently carry the isMicrobe/requiredCfu flags this module's
// other endpoints expect), so the Microbe Outward page can prefill
// requirement rows from a selected production task the same way Material
// Issue by BOM prefills raw-material rows. Required CFU/g defaults to that
// microbe's current stock-weighted average potency (no per-recipe target
// potency exists yet) — the frontend keeps it editable.
export const getProductMicrobeRequirements = async (req, res) => {
  try {
    const { product_code, qty } = req.query
    if (!product_code) return res.status(400).json({ success: false, error: 'product_code required', code: 'VALIDATION_ERROR' })
    const orderQty = Number(qty) || 0

    const [recipeRows, microbes] = await Promise.all([
      prisma.recipeDb.findMany({ where: { productCode: product_code } }),
      prisma.microbeMaster.findMany(),
    ])

    const microbeByName = new Map(microbes.map((m) => [m.microbeName.trim().toLowerCase(), m]))

    const matched = recipeRows
      .map((r) => ({ recipe: r, microbe: microbeByName.get(r.rmName.trim().toLowerCase()) }))
      .filter((x) => x.microbe)

    if (!matched.length) return res.json({ success: true, has_microbes: false, microbes: [] })

    const results = []
    for (const { recipe, microbe } of matched) {
      const activeInward = await prisma.microbialSfgInward.findMany({
        where: { microbeCode: microbe.microbeCode, status: 'ACTIVE', remainingQtyKg: { gt: 0 } },
        select: { remainingQtyKg: true, inhouseCfuPerG: true },
      })
      const totalKg = activeInward.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
      const avgCfuPerG = totalKg > 0
        ? activeInward.reduce((s, i) => s + Number(i.inhouseCfuPerG) * Number(i.remainingQtyKg), 0) / totalKg
        : 0

      results.push({
        microbe_id: microbe.microbeId,
        microbe_code: microbe.microbeCode,
        microbe_name: microbe.microbeName,
        rm_code: recipe.rmCode,
        rm_name: recipe.rmName,
        qty_per_unit: Number(recipe.qtyPerUnit),
        required_qty_kg: Number((Number(recipe.qtyPerUnit) * orderQty).toFixed(4)),
        required_cfu_per_g: avgCfuPerG ? Number(avgCfuPerG.toFixed(2)) : null,
        current_stock_kg: Number(totalKg.toFixed(3)),
      })
    }

    return res.json({ success: true, has_microbes: true, microbes: results })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const getAllocationsForPlan = async (req, res) => {
  try {
    const rows = await prisma.microbialSfgAllocation.findMany({
      where: { planId: req.params.planId },
      include: { inward: { select: { biomassBatchCode: true, dateOfHarvest: true, location: true } } },
      orderBy: { createdAt: 'asc' },
    })
    const data = rows.map(r => ({
      ...r,
      biomass_batch_code: r.inward?.biomassBatchCode ?? null,
      date_of_harvest:    r.inward?.dateOfHarvest    ?? null,
      batch_location:     r.inward?.location         ?? null,
      inward: undefined,
    }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
