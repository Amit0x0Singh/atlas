import fs from 'fs';
import prisma from '../../../db.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';

export const deleteBackup = async (req, res) => {
  const job = await prisma.backupJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ success: false, error: 'Backup not found.' });
  if (job.status === 'RUNNING') {
    return res.status(409).json({ success: false, error: 'Cannot delete a backup that is still running.' });
  }

  if (job.filePath) {
    try { fs.unlinkSync(job.filePath); } catch { /* best-effort — ENOENT etc. are fine */ }
  }
  await prisma.backupJob.delete({ where: { id: job.id } });

  await writeAudit({ ...auditUser(req), action: 'DELETE', tableName: 'backup_jobs', recordId: job.id, notes: job.name });

  res.json({ success: true });
};
