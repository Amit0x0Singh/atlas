import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { toCanonical } from '../../../../utils/uom.js'
import { syncTotalRecipe } from '../recipe-utils.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const bulkSaveRecipe = async (req, res) => {
  try {
    const { rows } = req.body
    if (!rows || !Array.isArray(rows) || rows.length === 0) return res.status(400).json({ success: false, error: 'No rows provided', code: 'VALIDATION_ERROR' })
    const valid = rows.filter(r => r.productCode && r.productName && r.rmCode && r.rmName && r.qtyPerUnit && r.uom)
    if (!valid.length) return res.status(400).json({ success: false, error: 'No valid rows found', code: 'VALIDATION_ERROR' })
    let saved = 0
    const touchedProductCodes = new Set()
    // Every row of one (productCode, recipeNo) shares the recipe name — the
    // last non-empty name seen for that pair wins, then it's written across
    // all of that recipe's rows below.
    const recipeNames = new Map()
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
      const nameKey = `${r.productCode}::${recipeNo}`
      const recipeName = (r.recipeName || '').trim() || null
      if (recipeName) recipeNames.set(nameKey, recipeName)

      const data = {
        productCode: r.productCode, productName: r.productName, recipeNo, recipeName, rmName: r.rmName,
        qtyPerUnit: canonical.qty, uom: canonical.uom, roleType: r.roleType || 'INGREDIENT',
        isMicrobe: !!r.isMicrobe, microbeCode: r.microbeCode || null,
        requiredCfu: r.requiredCfu != null && r.requiredCfu !== '' ? parseFloat(r.requiredCfu) : null,
      }

      if (r.id) {
        // Editing an existing row: if the corrected name now resolves to a
        // *different* code than before, this must rename that same row in
        // place (targeted by its own id) — upserting by (productCode,
        // recipeNo, rmCode) would instead insert a brand-new row under the
        // new code and leave the stale original row sitting there untouched.
        const collision = await prisma.recipeDb.findUnique({ where: { productCode_recipeNo_rmCode: { productCode: r.productCode, recipeNo, rmCode: r.rmCode } } })
        if (collision && collision.id !== r.id) {
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

    // Backfill the recipe name onto every row of each touched recipe so a
    // row that wasn't itself dirty still carries the current name.
    for (const [key, name] of recipeNames) {
      const [productCode, recipeNo] = key.split('::')
      await prisma.recipeDb.updateMany({ where: { productCode, recipeNo: parseInt(recipeNo, 10) }, data: { recipeName: name } })
    }

    for (const productCode of touchedProductCodes) await syncTotalRecipe(productCode)
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'masters', tableName: 'recipe_db', recordId: [...touchedProductCodes].join(','), newValue: { savedRows: saved, productCodes: [...touchedProductCodes] } })
    return res.json({ success: true, saved, message: `${saved} rows saved` })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Rename a recipe without touching its rows — used when the operator edits
// the recipe name but hasn't changed any ingredient.
export const renameRecipe = async (req, res) => {
  try {
    const { productCode, recipeNo, recipeName } = req.body || {}
    if (!productCode || !recipeNo) return res.status(400).json({ success: false, error: 'productCode and recipeNo required', code: 'VALIDATION_ERROR' })
    const name = (recipeName || '').trim() || null
    const { count } = await prisma.recipeDb.updateMany({
      where: { productCode, recipeNo: parseInt(recipeNo, 10) },
      data: { recipeName: name },
    })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'masters', tableName: 'recipe_db', recordId: `${productCode}#${recipeNo}`, notes: 'rename-recipe', newValue: { recipeName: name, rowsUpdated: count } })
    return res.json({ success: true, updated: count })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
