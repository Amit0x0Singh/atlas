import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js';

export const deleteRm = async (req, res) => {
  try {
    const deleted = await prisma.rmMaster.delete({ where: { itemCode: req.params.itemCode } })
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'masters', tableName: 'rm_master', recordId: deleted.itemCode, oldValue: deleted })
    return res.json({ success: true, message: 'Deleted' })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
