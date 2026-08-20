import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { syncTotalRecipe } from '../recipe-utils.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const deleteRecipeRow = async (req, res) => {
  try {
    const row = await prisma.recipeDb.delete({ where: { id: req.params.id } })
    await syncTotalRecipe(row.productCode)
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'masters', tableName: 'recipe_db', recordId: row.id, oldValue: row })
    return res.json({ success: true, message: 'Row deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const deleteProductRecipe = async (req, res) => {
  try {
    const rows = await prisma.recipeDb.findMany({ where: { productCode: req.params.productCode } })
    const result = await prisma.recipeDb.deleteMany({ where: { productCode: req.params.productCode } })
    await syncTotalRecipe(req.params.productCode)
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'masters', tableName: 'recipe_db', recordId: req.params.productCode, oldValue: { rows } })
    return res.json({ success: true, deleted: result.count })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
