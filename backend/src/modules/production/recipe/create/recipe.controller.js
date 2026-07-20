import prisma from '../../../../db.js'
import { toCanonical } from '../../../../utils/uom.js'
import { syncTotalRecipe } from '../recipe-utils.js'

export const bulkSaveRecipe = async (req, res) => {
  try {
    const { rows } = req.body
    if (!rows || !Array.isArray(rows) || rows.length === 0) return res.status(400).json({ success: false, error: 'No rows provided', code: 'VALIDATION_ERROR' })
    const valid = rows.filter(r => r.productCode && r.productName && r.rmCode && r.rmName && r.qtyPerUnit && r.uom)
    if (!valid.length) return res.status(400).json({ success: false, error: 'No valid rows found', code: 'VALIDATION_ERROR' })
    let saved = 0
    const touchedProductCodes = new Set()
    for (const r of valid) {
      // CFU/g-style potency rows pass through unchanged; everything else
      // (kg/g/mg/L/ml/...) converts to the canonical KG/L before saving.
      let canonical
      try {
        canonical = toCanonical(parseFloat(r.qtyPerUnit), r.uom)
      } catch (e) {
        return res.status(400).json({ success: false, error: `Row for ${r.rmName}: ${e.message}`, code: 'VALIDATION_ERROR' })
      }
      const recipeNo = r.recipeNo || 1
      const data = { productCode: r.productCode, productName: r.productName, recipeNo, rmName: r.rmName, qtyPerUnit: canonical.qty, uom: canonical.uom, roleType: r.roleType || 'INGREDIENT' }

      if (r.id) {
        // Editing an existing row: if the corrected name now resolves to a
        // *different* code than before, this must rename that same row in
        // place (targeted by its own id) — upserting by (productCode,
        // recipeNo, rmCode) would instead insert a brand-new row under the
        // new code and leave the stale original row sitting there untouched.
        const collision = await prisma.recipeDb.findUnique({ where: { productCode_recipeNo_rmCode: { productCode: r.productCode, recipeNo, rmCode: r.rmCode } } })
        if (collision && collision.id !== r.id) {
          // Another row already owns the target code — merge into it (that
          // row wins) and drop this one, rather than violating the unique
          // constraint on (productCode, recipeNo, rmCode).
          await prisma.recipeDb.update({ where: { id: collision.id }, data })
          await prisma.recipeDb.delete({ where: { id: r.id } })
        } else {
          await prisma.recipeDb.update({ where: { id: r.id }, data: { ...data, rmCode: r.rmCode } })
        }
      } else {
        await prisma.recipeDb.upsert({
          where: { productCode_recipeNo_rmCode: { productCode: r.productCode, recipeNo, rmCode: r.rmCode } },
          create: { ...data, rmCode: r.rmCode },
          update: data,
        })
      }
      touchedProductCodes.add(r.productCode)
      saved++
    }
    for (const productCode of touchedProductCodes) await syncTotalRecipe(productCode)
    return res.json({ success: true, saved, message: `${saved} rows saved` })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const fixRmMapping = async (req, res) => {
  try {
    const { mappings } = req.body
    if (!Array.isArray(mappings) || mappings.length === 0) return res.status(400).json({ success: false, error: 'mappings array required', code: 'VALIDATION_ERROR' })
    let totalFixed = 0
    const log = []
    for (const m of mappings) {
      if (!m.fromCode || !m.toCode) continue
      // A mapping target can be an RM Master item, or (kind: 'product') an
      // SFG being used as an ingredient — resolved from Product Master instead.
      let targetName
      if (m.kind === 'product') {
        const targetProduct = await prisma.productMaster.findUnique({ where: { productCode: m.toCode } })
        if (!targetProduct) { log.push({ from: m.fromCode, error: `Target product ${m.toCode} not found in Product Master` }); continue }
        targetName = targetProduct.productName
      } else {
        const targetRm = await prisma.rmMaster.findUnique({ where: { itemCode: m.toCode } })
        if (!targetRm) { log.push({ from: m.fromCode, error: `Target RM ${m.toCode} not found in RM Master` }); continue }
        targetName = targetRm.itemName
      }
      const affected = await prisma.recipeDb.findMany({ where: { rmCode: m.fromCode } })
      for (const row of affected) {
        try {
          const existing = await prisma.recipeDb.findUnique({ where: { productCode_rmCode: { productCode: row.productCode, rmCode: m.toCode } } })
          if (existing) {
            await prisma.recipeDb.update({ where: { productCode_rmCode: { productCode: row.productCode, rmCode: m.toCode } }, data: { qtyPerUnit: row.qtyPerUnit, uom: row.uom } })
            await prisma.recipeDb.delete({ where: { id: row.id } })
          } else {
            await prisma.recipeDb.update({ where: { id: row.id }, data: { rmCode: m.toCode, rmName: targetName } })
          }
          totalFixed++
        } catch (e) { log.push({ from: m.fromCode, rowId: row.id, error: e.message }) }
      }
      log.push({ from: m.fromCode, to: m.toCode, fixed: affected.length })
    }
    return res.json({ success: true, totalFixed, log })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
