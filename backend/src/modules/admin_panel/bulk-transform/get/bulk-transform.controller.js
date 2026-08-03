import prisma from '../../../../db.js'

export const getTransformStatus = async (req, res) => {
  const job = await prisma.transformJob.findUnique({
    where: { id: req.params.id },
    select: {
      id: true, status: true, recordsTotal: true, recordsDone: true,
      fieldsUpdated: true, skippedCount: true, errorMessage: true,
      createdAt: true, completedAt: true,
    },
  })
  if (!job) return res.status(404).json({ success: false, error: 'Transform job not found.' })
  res.json({ success: true, data: job })
}
