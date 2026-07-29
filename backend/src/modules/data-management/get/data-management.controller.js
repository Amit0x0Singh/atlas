import prisma from '../../../db.js';

// BackupJob.fileSizeBytes is a Prisma BigInt — must convert before res.json().
function serializeBackup(job) {
  if (!job) return job;
  return { ...job, fileSizeBytes: job.fileSizeBytes != null ? Number(job.fileSizeBytes) : null };
}

export const listDeletes = async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(200, parseInt(req.query.limit) || 25);
  const { query, deleteType, status } = req.query;

  const where = {};
  if (query) where.OR = [{ remarks: { contains: query, mode: 'insensitive' } }, { deletedByName: { contains: query, mode: 'insensitive' } }];
  if (deleteType) where.deleteType = deleteType;
  if (status) where.status = status;

  const [total, records] = await Promise.all([
    prisma.deleteJob.count({ where }),
    prisma.deleteJob.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
  ]);

  res.json({ success: true, data: records, total, page, limit });
};

export const getDeleteDetails = async (req, res) => {
  const job = await prisma.deleteJob.findUnique({ where: { id: req.params.id } });
  if (!job) return res.status(404).json({ success: false, error: 'Delete job not found.' });

  const backupJob = job.backupJobId
    ? await prisma.backupJob.findUnique({ where: { id: job.backupJobId } })
    : null;

  res.json({ success: true, data: { ...job, backupJob: serializeBackup(backupJob) } });
};

export const getDeleteStatus = async (req, res) => {
  const job = await prisma.deleteJob.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, status: true, tablesTotal: true, tablesDone: true,
      currentTable: true, recordCount: true, errorMessage: true,
      createdAt: true, completedAt: true,
    },
  });
  if (!job) return res.status(404).json({ success: false, error: 'Delete job not found.' });
  res.json({ success: true, data: job });
};
