import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'

export const listRecipe = async (req, res) => {
  try {
    const { productCode, recipe_no } = req.query
    // An explicitly-passed but empty productCode (e.g. a task whose product
    // never resolved to a real code) must filter to nothing — silently
    // falling through to "no filter" would dump every product's BOM rows.
    const where = productCode !== undefined ? { productCode } : {}
    if (recipe_no !== undefined && recipe_no !== '') where.recipeNo = parseInt(recipe_no, 10)
    const rows = await prisma.recipeDb.findMany({ where, orderBy: [{ productCode: 'asc' }, { recipeNo: 'asc' }, { rmName: 'asc' }] })
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

export const listRecipeProducts = async (req, res) => {
  try {
    const products = await prisma.recipeDb.findMany({ distinct: ['productCode'], select: { productCode: true, productName: true } })
    return res.json({ success: true, data: products })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
