import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const updateEquipment = async (req, res) => {
  try {
    const { equipName, plant, workingVolume, operation, designatedProduct, workingUnit } = req.body
    const existing = await prisma.equipmentMaster.findUnique({ where: { equipId: req.params.equipId } })
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
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'masters', tableName: 'equipment_master', recordId: item.equipCode, oldValue: existing, newValue: item })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
