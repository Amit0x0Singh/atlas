import prisma from '../../../../db.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'
import { padItemCode } from '../../../../utils/item-code.js'

export const createRm = async (req, res) => {
  try {
    const { itemName, inventoryUom, operationalUom, trackingType, category, subCategory, state, density, conversionRequired, lowStockLevel, highStockLevel } = req.body
    const rawItemCode = req.body.itemCode
    const itemCode = rawItemCode ? padItemCode(rawItemCode) : rawItemCode
    if (!itemCode || !itemName || !inventoryUom)
      return res.status(400).json({ success: false, error: 'itemCode, itemName and inventoryUom are required', code: 'VALIDATION_ERROR' })
    // The master unit is the item's physical stock unit — must be a real
    // KG/L/NOS quantity, not a "special" unit like CFU/g (that's a recipe-line
    // dosage concept, not how the item itself is stocked).
    const canonicalInventoryUom = normalizeUom(inventoryUom)
    if (!CANONICAL_UNITS.includes(canonicalInventoryUom))
      return res.status(400).json({ success: false, error: `inventoryUom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${inventoryUom}"`, code: 'VALIDATION_ERROR' })
    let canonicalOperationalUom = null
    if (operationalUom) {
      canonicalOperationalUom = normalizeUom(operationalUom)
      if (!CANONICAL_UNITS.includes(canonicalOperationalUom))
        return res.status(400).json({ success: false, error: `operationalUom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${operationalUom}"`, code: 'VALIDATION_ERROR' })
    }
    const isConversionRequired = conversionRequired === true
    // Density is only meaningful (and only required) when the two UOMs
    // actually differ — same-unit items never need a conversion factor.
    if (canonicalOperationalUom && canonicalOperationalUom !== canonicalInventoryUom) {
      if (!isConversionRequired)
        return res.status(400).json({ success: false, error: 'Conversion Required must be set to Yes when Inventory UOM and Operational UOM differ', code: 'VALIDATION_ERROR' })
      if (!density || parseFloat(density) <= 0)
        return res.status(400).json({ success: false, error: 'Density is required when Inventory UOM and Operational UOM differ', code: 'VALIDATION_ERROR' })
    }
    // Check both the padded and as-typed form — a pre-existing legacy row
    // saved before this padding rule (e.g. unpadded "177822") must still be
    // caught as a duplicate, not slip past because this request now checks
    // for "0177822" instead.
    // itemName is stored lowercase (RULES.LOWER) and unique — match it
    // case-insensitively so "Potassium Humate" still catches an existing
    // "potassium humate" row instead of slipping past into create().
    const existing = await prisma.rmMaster.findFirst({ where: { OR: [{ itemCode }, { itemCode: rawItemCode }, { itemName: { equals: itemName, mode: 'insensitive' } }] } })
    if (existing) return res.status(409).json({ success: false, error: 'Item code or name already exists', code: 'CONFLICT' })
    const item = await prisma.rmMaster.create({
      data: {
        itemCode, itemName, inventoryUom: canonicalInventoryUom, operationalUom: canonicalOperationalUom, trackingType: trackingType || 'PACK',
        category: category || null,
        subCategory: subCategory || null,
        state: state || null,
        density: density ? parseFloat(density) : null,
        conversionRequired: isConversionRequired,
        lowStockLevel: lowStockLevel ? parseFloat(lowStockLevel) : null,
        highStockLevel: highStockLevel ? parseFloat(highStockLevel) : null,
      }
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
