import prisma from '../../../../../db.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'

// Recent stock loss adjustments — powers the "Recent Adjustments" list on
// the Stock Loss tab. The full record lives in Transaction History
// (getSfgHistory merges these in as ADJUSTMENT rows).
export const listSfgAdjustments = async (req, res) => {
  try {
    const { microbe_code, from, to } = req.query
    const where = {}
    if (microbe_code) where.microbeCode = microbe_code
    if (from || to) {
      where.adjustedAt = {}
      if (from) where.adjustedAt.gte = new Date(from)
      if (to) where.adjustedAt.lte = new Date(`${to}T23:59:59.999Z`)
    }

    const rows = await prisma.microbialSfgAdjustment.findMany({
      where,
      orderBy: { adjustedAt: 'desc' },
      take: 50,
    })
    return res.json({ success: true, data: toSnakeRow(rows) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
