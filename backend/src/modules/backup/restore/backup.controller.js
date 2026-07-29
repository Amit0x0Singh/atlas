import prisma from '../../../db.js';
import { auditUser } from '../../../middleware/audit.js';
import { runRestore } from '../services/backup-restore.service.js';

export const restoreFromHistory = async (req, res) => {
  const backupJob = await prisma.backupJob.findUnique({ where: { id: req.params.id } });
  if (!backupJob) return res.status(404).json({ success: false, error: 'Backup not found.' });
  if (backupJob.status !== 'COMPLETED' || !backupJob.filePath) {
    return res.status(409).json({ success: false, error: 'Only a completed backup with a file can be restored.' });
  }

  const { userId, username, ip } = auditUser(req);
  const restoreJob = await prisma.restoreJob.create({
    data: {
      backupJobId: backupJob.id,
      sourceType: 'HISTORY',
      startedBy: userId,
      startedByName: req.user?.full_name || username,
    },
  });

  res.status(202).json({ success: true, data: { id: restoreJob.id } });

  // See create/backup.controller.js — AuditLog.userId is @db.Uuid, this
  // app's user_id is always an email, so attribute by username only.
  runRestore(restoreJob.id, backupJob.filePath, { username, ip }).catch((err) => {
    console.error('[RESTORE ERROR]', err);
  });
};

export const restoreFromUpload = async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded.' });

  const { userId, username, ip } = auditUser(req);
  const restoreJob = await prisma.restoreJob.create({
    data: {
      sourceType: 'UPLOAD',
      sourceFileName: req.file.originalname,
      startedBy: userId,
      startedByName: req.user?.full_name || username,
    },
  });

  res.status(202).json({ success: true, data: { id: restoreJob.id } });

  runRestore(restoreJob.id, req.file.path, { username, ip }).catch((err) => {
    console.error('[RESTORE ERROR]', err);
  });
};
