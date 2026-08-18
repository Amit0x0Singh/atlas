import prisma from '../../../../db.js'
import { normalizePlant } from '../../../../utils/plant.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'
import { getMaxProductCodeNum, formatProductCode } from '../../../../utils/product-code.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const createProduct = async (req, res) => {
  try {
    const { productName, plant, uom, state } = req.body
    if (!productName)
      return res.status(400).json({ success: false, error: 'productName is required', code: 'VALIDATION_ERROR' })
    let canonicalUom = null
    if (uom) {
      canonicalUom = normalizeUom(uom)
      if (!CANONICAL_UNITS.includes(canonicalUom))
        return res.status(400).json({ success: false, error: `uom must convert to one of ${CANONICAL_UNITS.join(', ')} — got "${uom}"`, code: 'VALIDATION_ERROR' })
    }
    // productName is stored lowercase (RULES.LOWER) and unique — match
    // case-insensitively so an existing "npk biofertilizer" is still caught
    // when someone submits "NPK Biofertilizer" (avoids a raw unique-
    // constraint error from create() below).
    const existing = await prisma.productMaster.findFirst({ where: { productName: { equals: productName, mode: 'insensitive' } } })
    if (existing) return res.status(409).json({ success: false, error: 'Product name already exists', code: 'CONFLICT' })
    // productCode is never accepted here — the backend assigns it.
    const nextNum = await getMaxProductCodeNum(prisma)
    const item = await prisma.productMaster.create({
      data: { productCode: formatProductCode(nextNum + 1), productName, plant: normalizePlant(plant), uom: canonicalUom, state: state || null }
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', module: 'masters', tableName: 'product_master', recordId: item.productCode, newValue: item })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
