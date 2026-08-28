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
      where.createdAt = {}
      if (from) where.createdAt.gte = new Date(from)
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59.999Z`)
    }

    // Guarded so a stale Prisma client (model added but `prisma generate`
    // not yet re-run) returns an empty list instead of a 500.
    const rows = prisma.microbialSfgAdjustment
      ? await prisma.microbialSfgAdjustment.findMany({ where, orderBy: { createdAt: 'desc' }, take: 50 })
      : []

    // The adjustment row has no location of its own — resolve each one from
    // its container's current storage slot (one lookup, mapped by id).
    const containerIds = [...new Set(rows.map((r) => r.containerId).filter(Boolean))]
    const locByContainer = new Map(
      (containerIds.length
        ? await prisma.microbialSfgContainer.findMany({
            where: { containerId: { in: containerIds } },
            select: { containerId: true, location: true },
          })
        : []
      ).map((c) => [c.containerId, c.location]),
    )
    const data = rows.map((r) => ({ ...r, location: locByContainer.get(r.containerId) || null }))

    return res.json({ success: true, data: toSnakeRow(data) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
