import fs from 'fs';
import prisma from '../../../db.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';

export const downloadBackup = async (req, res) => {
  const job = await prisma.backupJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ success: false, error: 'Backup not found.' });
  if (job.status !== 'COMPLETED' || !job.filePath || !fs.existsSync(job.filePath)) {
    return res.status(404).json({ success: false, error: 'Backup file is not available for download.' });
  }

  await writeAudit({ ...auditUser(req), action: 'DOWNLOAD', tableName: 'backup_jobs', recordId: job.id, notes: job.name });

  res.download(job.filePath, job.fileName || `${job.id}.json.gz`);
};
