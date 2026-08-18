import prisma from '../../../../db.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const updateRm = async (req, res) => {
  try {
    const { itemName, inventoryUom, operationalUom, trackingType, category, subCategory, state, density, conversionRequired, lowStockLevel, highStockLevel } = req.body
    let canonicalInventoryUom = inventoryUom
    if (inventoryUom) {
      canonicalInventoryUom = normalizeUom(inventoryUom)
      if (!CANONICAL_UNITS.includes(canonicalInventoryUom))
        return res.status(400).json({ success: false, error: `inventoryUom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${inventoryUom}"`, code: 'VALIDATION_ERROR' })
    }
    const data = { itemName, inventoryUom: canonicalInventoryUom }
    let canonicalOperationalUom
    if (operationalUom !== undefined) {
      canonicalOperationalUom = null
      if (operationalUom) {
        canonicalOperationalUom = normalizeUom(operationalUom)
        if (!CANONICAL_UNITS.includes(canonicalOperationalUom))
          return res.status(400).json({ success: false, error: `operationalUom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${operationalUom}"`, code: 'VALIDATION_ERROR' })
      }
      data.operationalUom = canonicalOperationalUom
    }
    if (trackingType) data.trackingType = trackingType
    if (category !== undefined) data.category = category || null
    if (subCategory !== undefined) data.subCategory = subCategory || null
    if (state !== undefined) data.state = state || null
    if (density !== undefined) data.density = density ? parseFloat(density) : null
    if (conversionRequired !== undefined) data.conversionRequired = conversionRequired === true

    // Density is only required when the two UOMs actually differ — validate
    // against the resulting row (existing values where this request didn't
    // touch a field), not just the fields present on this request.
    const existing = await prisma.rmMaster.findUnique({ where: { itemCode: req.params.itemCode } })
    if (!existing) return res.status(404).json({ success: false, error: 'RM item not found', code: 'NOT_FOUND' })
    const finalInventoryUom = data.inventoryUom ?? existing.inventoryUom
    const finalOperationalUom = canonicalOperationalUom !== undefined ? canonicalOperationalUom : existing.operationalUom
    const finalConversionRequired = data.conversionRequired ?? existing.conversionRequired
    const finalDensity = data.density !== undefined ? data.density : existing.density
    if (finalOperationalUom && finalOperationalUom !== finalInventoryUom) {
      if (!finalConversionRequired)
        return res.status(400).json({ success: false, error: 'Conversion Required must be set to Yes when Inventory UOM and Operational UOM differ', code: 'VALIDATION_ERROR' })
      if (!finalDensity || finalDensity <= 0)
        return res.status(400).json({ success: false, error: 'Density is required when Inventory UOM and Operational UOM differ', code: 'VALIDATION_ERROR' })
    }

    if (lowStockLevel !== undefined) data.lowStockLevel = lowStockLevel ? parseFloat(lowStockLevel) : null
    if (highStockLevel !== undefined) data.highStockLevel = highStockLevel ? parseFloat(highStockLevel) : null
    const item = await prisma.rmMaster.update({ where: { itemCode: req.params.itemCode }, data })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'masters', tableName: 'rm_master', recordId: item.itemCode, oldValue: existing, newValue: item })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
