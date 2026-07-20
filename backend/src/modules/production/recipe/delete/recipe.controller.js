import prisma from '../../../../db.js'
import { syncTotalRecipe } from '../recipe-utils.js'

export const deleteRecipeRow = async (req, res) => {
  try {
    const row = await prisma.recipeDb.delete({ where: { id: req.params.id } })
    await syncTotalRecipe(row.productCode)
    return res.json({ success: true, message: 'Row deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const deleteProductRecipe = async (req, res) => {
  try {
    const result = await prisma.recipeDb.deleteMany({ where: { productCode: req.params.productCode } })
    await syncTotalRecipe(req.params.productCode)
    return res.json({ success: true, deleted: result.count })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
