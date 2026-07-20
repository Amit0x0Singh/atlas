import prisma from '../../../../db.js'
import { normalizePlant } from '../../../../utils/plant.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'

export const createProduct = async (req, res) => {
  try {
    const { productCode, productName, plant, uom, state } = req.body
    if (!productCode || !productName)
      return res.status(400).json({ success: false, error: 'productCode and productName are required', code: 'VALIDATION_ERROR' })
    let canonicalUom = null
    if (uom) {
      canonicalUom = normalizeUom(uom)
      if (!CANONICAL_UNITS.includes(canonicalUom))
        return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
    }
    const existing = await prisma.productMaster.findFirst({ where: { OR: [{ productCode }, { productName }] } })
    if (existing) return res.status(409).json({ success: false, error: 'Product code or name already exists', code: 'CONFLICT' })
    const item = await prisma.productMaster.create({
      data: { productCode, productName, plant: normalizePlant(plant), uom: canonicalUom, state: state || null }
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
