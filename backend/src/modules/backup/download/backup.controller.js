import fs from 'fs';
import prisma from '../../../db.js';
import { writeAudit, auditUser } from '../../../middleware/audit.js';
import { streamBackupAsExcel } from '../services/backup-excel-export.service.js';
import { toSafeErrorMessage } from '../../../utils/safe-error.js';

export const downloadBackup = async (req, res) => {
  const job = await prisma.backupJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ success: false, error: 'Backup not found.' });
  if (job.status !== 'COMPLETED' || !job.filePath || !fs.existsSync(job.filePath)) {
    return res.status(404).json({ success: false, error: 'Backup file is not available for download.' });
  }

  await writeAudit({ ...auditUser(req), action: 'DOWNLOAD', tableName: 'backup_jobs', recordId: job.id, notes: job.name });

  res.download(job.filePath, job.fileName || `${job.id}.json.gz`);
};

// Primarily for reporting/analysis — the original .json.gz is untouched by
// this and remains the preferred, exact restore source. This derived .xlsx
// can also be uploaded back through Restore (see
// backup-excel-import.service.js), but that path is a best-effort
// reconstruction: some numeric/JSON values were reformatted for
// readability on the way out and can't be recovered byte-for-byte.
export const downloadBackupExcel = async (req, res) => {
  const job = await prisma.backupJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ success: false, error: 'Backup not found.' });
  if (job.status !== 'COMPLETED' || !job.filePath || !fs.existsSync(job.filePath)) {
    return res.status(404).json({ success: false, error: 'Backup file is not available for export.' });
  }

  const safeName = job.name.replace(/[\\/?*[\]:]/g, '_').slice(0, 100);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safeName || job.id}.xlsx"`);

  await writeAudit({ ...auditUser(req), action: 'DOWNLOAD', tableName: 'backup_jobs', recordId: job.id, notes: `${job.name} (Excel export)` });

  try {
    await streamBackupAsExcel(res, job);
  } catch (err) {
    console.error('[BACKUP EXCEL EXPORT ERROR]', err);
    // Headers are already sent once streaming starts — the client just gets
    // a truncated/invalid file in that case, there's no clean way to signal
    // a JSON error mid-stream. Only respond with JSON if nothing was sent yet.
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' });
    } else {
      res.end();
    }
  }
};
