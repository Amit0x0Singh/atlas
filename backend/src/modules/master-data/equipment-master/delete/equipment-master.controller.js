import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const deleteEquipment = async (req, res) => {
  try {
    const deleted = await prisma.equipmentMaster.delete({ where: { equipId: req.params.equipId } })
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'masters', tableName: 'equipment_master', recordId: deleted.equipCode, oldValue: deleted })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
