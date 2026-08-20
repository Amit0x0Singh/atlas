import prisma from '../../../../../db.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js'
import { writeAudit, auditUser } from '../../../../../middleware/audit.js'

export const deleteMicrobe = async (req, res) => {
  try {
    const deleted = await prisma.microbeMaster.delete({ where: { microbeId: req.params.id } })
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'masters', tableName: 'microbe_master', recordId: deleted.microbeCode, oldValue: deleted })
    return res.json({ success: true })
  } catch (e) {
    if (e.code === 'P2025') return res.status(404).json({ success: false, error: 'Microbe not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: toSafeErrorMessage(e), code: 'INTERNAL_ERROR' })
  }
}
