import prisma from '../../../../db.js'

const INCLUDE_ALL = {
  biomassInputs: true,
  technicalDetail: true,
  formulationCycles: { orderBy: { cycleNo: 'asc' } },
  unloadingLog: true,
  sievingLog: true,
  packingLog: true,
  qcSample: true,
  inventoryHandover: true,
}

export const listBatches = async (req, res) => {
  try {
    const { category = 'powder', status, page = 1, limit = 50 } = req.query
    // category is stored lowercase (RULES.LOWER) but callers may still pass
    // any case, so match case-insensitively rather than assuming lowercase input.
    const where = { category: { equals: category, mode: 'insensitive' } }
    if (status) where.status = status
    const [batches, total] = await Promise.all([
      prisma.productionBatch.findMany({
        where,
        include: { biomassInputs: { select: { id: true } }, formulationCycles: { select: { id: true } }, packingLog: { select: { totalQtyPacked: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.productionBatch.count({ where })
    ])
    return res.json({ success: true, data: batches, total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};

export const getBatch = async (req, res) => {
  try {
    const batch = await prisma.productionBatch.findUnique({ where: { id: req.params.id }, include: INCLUDE_ALL })
    if (!batch) return res.status(404).json({ success: false, error: 'Batch not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: batch })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
};
