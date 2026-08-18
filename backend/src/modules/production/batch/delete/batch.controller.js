import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

export const deleteFormulationCycle = async (req, res) => {
  try {
    const deleted = await prisma.formulationCycle.delete({ where: { id: req.params.cycleId } })
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'production', tableName: 'formulation_cycle', recordId: req.params.cycleId, oldValue: deleted })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
