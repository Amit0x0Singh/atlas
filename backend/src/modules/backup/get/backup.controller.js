import prisma from '../../../db.js';

// BackupJob.fileSizeBytes is a Prisma BigInt — res.json() throws on a raw
// BigInt, so every response touching a BackupJob row must go through this.
function serializeBackup(job) {
  if (!job) return job;
  return { ...job, fileSizeBytes: job.fileSizeBytes != null ? Number(job.fileSizeBytes) : null };
}

export const listBackups = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, parseInt(req.query.limit) || 25);
  const { query, type, status, sortBy = 'createdAt', sortDir = 'desc' } = req.query;

  const where = {};
  if (query) where.name = { contains: query, mode: 'insensitive' };
  if (type) where.type = type;
  if (status) where.status = status;

  const ORDERABLE = new Set(['createdAt', 'name', 'fileSizeBytes', 'recordCount', 'status', 'type']);
  const orderBy = { [ORDERABLE.has(sortBy) ? sortBy : 'createdAt']: sortDir === 'asc' ? 'asc' : 'desc' };

  const [total, records] = await Promise.all([
    prisma.backupJob.count({ where }),
    prisma.backupJob.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit }),
  ]);

  res.json({ success: true, data: records.map(serializeBackup), total, page, limit });
};

export const getBackupDetails = async (req, res) => {
  const job = await prisma.backupJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ success: false, error: 'Backup not found.' });

  const restores = await prisma.restoreJob.findMany({
    where: { backupJobId: job.id },
    orderBy: { startedAt: 'desc' },
    take: 20,
  });

  res.json({ success: true, data: { ...serializeBackup(job), restores } });
};

export const getBackupStatus = async (req, res) => {
  const job = await prisma.backupJob.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, status: true, tablesTotal: true, tablesDone: true,
      currentTable: true, recordCount: true, errorMessage: true,
      createdAt: true, completedAt: true,
    },
  });
  if (!job) return res.status(404).json({ success: false, error: 'Backup not found.' });
  res.json({ success: true, data: { ...job, startedAt: job.createdAt } });
};

export const getRestoreStatus = async (req, res) => {
  const job = await prisma.restoreJob.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, status: true, tablesTotal: true, tablesDone: true,
      currentTable: true, recordCount: true, errorMessage: true,
      startedAt: true, completedAt: true,
    },
  });
  if (!job) return res.status(404).json({ success: false, error: 'Restore job not found.' });
  res.json({ success: true, data: job });
};

export const listRestoresForBackup = async (req, res) => {
  const restores = await prisma.restoreJob.findMany({
    where: { backupJobId: req.params.id },
    orderBy: { startedAt: 'desc' },
  });
  res.json({ success: true, data: restores });
};
