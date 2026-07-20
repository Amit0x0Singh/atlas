import prisma from '../../../../db.js'
import { normalizePlant } from '../../../../utils/plant.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'

export const updateProduct = async (req, res) => {
  try {
    const { productName, plant, uom, state } = req.body
    let canonicalUom = null
    if (uom) {
      canonicalUom = normalizeUom(uom)
      if (!CANONICAL_UNITS.includes(canonicalUom))
        return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
    }
    const item = await prisma.productMaster.update({
      where: { productCode: req.params.productCode },
      data: {
        productName,
        plant: plant !== undefined ? normalizePlant(plant) : undefined,
        uom: uom !== undefined ? canonicalUom : undefined,
        state: state !== undefined ? (state || null) : undefined,
      },
    })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
