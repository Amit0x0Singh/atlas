import prisma from '../../../../../db.js'
import { writeAudit, auditUser } from '../../../../../middleware/audit.js'

// Discards an in-progress issuance session (user chose to abandon it rather
// than resume) — the caller is also responsible for clearing the task's
// microbeIssueStarted flag so it reappears in the picker.
export const deleteOutwardSession = async (req, res) => {
  try {
    const deleted = await prisma.microbialSfgOutwardSession.delete({ where: { id: req.params.id } })
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'microbial', tableName: 'microbial_sfg_outward_session', recordId: req.params.id, oldValue: deleted })
    return res.json({ success: true })
  } catch (err) {
    // Already deleted / never existed — caller's intent (gone) is satisfied
    return res.json({ success: true })
  }
}
