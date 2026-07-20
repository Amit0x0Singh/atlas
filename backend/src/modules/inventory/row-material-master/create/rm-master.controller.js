import prisma from '../../../../db.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'
import { padItemCode } from '../../../../utils/item-code.js'

export const createRm = async (req, res) => {
  try {
    const { itemName, uom, trackingType, category, subCategory, state, density } = req.body
    const rawItemCode = req.body.itemCode
    const itemCode = rawItemCode ? padItemCode(rawItemCode) : rawItemCode
    if (!itemCode || !itemName || !uom)
      return res.status(400).json({ success: false, error: 'itemCode, itemName and uom are required', code: 'VALIDATION_ERROR' })
    // The master unit is the item's physical stock unit — must be a real
    // KG/L/NOS quantity, not a "special" unit like CFU/g (that's a recipe-line
    // dosage concept, not how the item itself is stocked).
    const canonicalUom = normalizeUom(uom)
    if (!CANONICAL_UNITS.includes(canonicalUom))
      return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
    // Check both the padded and as-typed form — a pre-existing legacy row
    // saved before this padding rule (e.g. unpadded "177822") must still be
    // caught as a duplicate, not slip past because this request now checks
    // for "0177822" instead.
    const existing = await prisma.rmMaster.findFirst({ where: { OR: [{ itemCode }, { itemCode: rawItemCode }, { itemName }] } })
    if (existing) return res.status(409).json({ success: false, error: 'Item code or name already exists', code: 'CONFLICT' })
    const item = await prisma.rmMaster.create({
      data: {
        itemCode, itemName, uom: canonicalUom, trackingType: trackingType || 'PACK',
        category: category || null,
        subCategory: subCategory || null,
        state: state || null,
        density: density ? parseFloat(density) : null,
      }
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
