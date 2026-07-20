import prisma from '../../../../db.js'

export const updateEquipment = async (req, res) => {
  try {
    const { equipName, plant, workingVolume, operation, designatedProduct, workingUnit } = req.body
    const item = await prisma.equipmentMaster.update({
      where: { equipId: req.params.equipId },
      // equipCode is intentionally not writable — it's assigned once at creation.
      data: {
        equipName,
        plant: plant ?? '',
        workingVolume: workingVolume !== undefined ? (parseFloat(workingVolume) || 0) : undefined,
        operation: operation ?? '',
        designatedProduct: designatedProduct !== undefined ? (designatedProduct || null) : undefined,
        workingUnit: workingUnit !== undefined ? (workingUnit || null) : undefined,
      },
    })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
