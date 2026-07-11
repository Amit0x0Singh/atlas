import prisma from '../../../../db.js'
import { findBestRmMatch, confidenceLabel } from '../../../../utils/fuzzy.js'

export const listRecipe = async (req, res) => {
  try {
    const { productCode } = req.query
    // An explicitly-passed but empty productCode (e.g. a task whose product
    // never resolved to a real code) must filter to nothing — silently
    // falling through to "no filter" would dump every product's BOM rows.
    const where = productCode !== undefined ? { productCode } : {}
    const rows = await prisma.recipeDb.findMany({ where, orderBy: [{ productCode: 'asc' }, { rmName: 'asc' }] })
    return res.json({ success: true, data: rows })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const listRecipeProducts = async (req, res) => {
  try {
    const products = await prisma.recipeDb.findMany({ distinct: ['productCode'], select: { productCode: true, productName: true } })
    return res.json({ success: true, data: products })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// A recipe row isn't always a raw material — it can be an SFG (semi-finished
// good) used as an ingredient in another product's recipe, in which case its
// code lives in Product Master instead of RM Master. Matching (and the
// reconcile suggestions below) checks both.
export const checkRmMapping = async (req, res) => {
  try {
    const [validRms, validProducts] = await Promise.all([
      prisma.rmMaster.findMany({ select: { itemCode: true, itemName: true } }),
      prisma.productMaster.findMany({ select: { productCode: true, productName: true } }),
    ])
    const validRmCodes      = new Set(validRms.map(r => r.itemCode))
    const validProductCodes = new Set(validProducts.map(p => p.productCode))
    const recipeCombos = await prisma.recipeDb.findMany({ distinct: ['rmCode'], select: { rmCode: true, rmName: true } })
    const matched = [], unmatched = []
    for (const r of recipeCombos) {
      if (validRmCodes.has(r.rmCode) || validProductCodes.has(r.rmCode)) {
        matched.push({ ...r, status: 'ok' })
      } else {
        const candidates = [
          ...validRms.map(rm => ({ itemCode: rm.itemCode, itemName: rm.itemName, kind: 'rm' })),
          ...validProducts.map(p => ({ itemCode: p.productCode, itemName: p.productName, kind: 'product' })),
        ]
        const scored = candidates.map(c => { const res = findBestRmMatch(r.rmName, [c]); return res ? { ...c, score: res.score, method: res.method } : null }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 3)
        const suggestions = scored.map(s => { const cl = confidenceLabel(s.score); return { itemCode: s.itemCode, itemName: s.itemName, kind: s.kind, score: s.score, pct: Math.round(s.score * 100), confidence: cl.label, color: cl.color } })
        const affectedRows = await prisma.recipeDb.count({ where: { rmCode: r.rmCode } })
        unmatched.push({ recipeRmCode: r.rmCode, recipeRmName: r.rmName, affectedRows, suggestions, autoSuggest: suggestions[0]?.score >= 0.80 ? suggestions[0] : null })
      }
    }
    return res.json({ success: true, data: { unmatched, matched: matched.length, total: recipeCombos.length } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
