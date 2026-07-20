import prisma from '../../../../db.js'

export const createEquipment = async (req, res) => {
  try {
    const { equipName, plant, workingVolume, operation, designatedProduct, workingUnit } = req.body
    if (!equipName) return res.status(400).json({ success: false, error: 'equipName is required', code: 'VALIDATION_ERROR' })
    const existing = await prisma.equipmentMaster.findUnique({ where: { equipName } })
    if (existing) return res.status(409).json({ success: false, error: 'Equipment already exists', code: 'CONFLICT' })
    const item = await prisma.equipmentMaster.create({
      // equipCode is never accepted here — the DB assigns it (sequence default).
      data: {
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
