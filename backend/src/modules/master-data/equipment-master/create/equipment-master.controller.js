import prisma from '../../../../db.js'
import { getMaxEquipCodeNum, formatEquipCode } from '../../../../utils/equip-code.js'

export const createEquipment = async (req, res) => {
  try {
    const { equipName, plant, workingVolume, operation, designatedProduct, workingUnit } = req.body
    if (!equipName) return res.status(400).json({ success: false, error: 'equipName is required', code: 'VALIDATION_ERROR' })
    // equipName is stored lowercase (RULES.LOWER) and unique — an exact-match
    // findUnique on raw input would miss an existing "Reactor A" vs stored
    // "reactor a" and let create() through, which then collides with the DB
    // unique constraint. Match case-insensitively instead.
    const existing = await prisma.equipmentMaster.findFirst({ where: { equipName: { equals: equipName, mode: 'insensitive' } } })
    if (existing) return res.status(409).json({ success: false, error: 'Equipment already exists', code: 'CONFLICT' })
    const nextNum = await getMaxEquipCodeNum(prisma)
    const item = await prisma.equipmentMaster.create({
      // equipCode is never accepted here — the backend assigns it.
      data: {
        equipCode: formatEquipCode(nextNum + 1),
        equipName,
        plant: plant || '',
        workingVolume: workingVolume ? parseFloat(workingVolume) : 0,
        operation: operation || '',
        designatedProduct: designatedProduct || null,
        workingUnit: workingUnit || null,
      }
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
