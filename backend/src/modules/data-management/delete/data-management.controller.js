import prisma from '../../../db.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';

// Removes a DeleteJob history row only — never touches its linked BackupJob
// (that's still independently downloadable/restorable via Backup History).
export const deleteDeleteJob = async (req, res) => {
  const job = await prisma.deleteJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ success: false, error: 'Delete job not found.' });
  if (job.status === 'BACKING_UP' || job.status === 'DELETING') {
    return res.status(409).json({ success: false, error: 'Cannot remove a delete job that is still running.' });
  }

  await prisma.deleteJob.delete({ where: { id: job.id } });
  await writeAudit({ ...auditUser(req), action: 'DELETE', tableName: 'delete_jobs', recordId: job.id, notes: 'Delete history entry removed.' });

  res.json({ success: true });
};
