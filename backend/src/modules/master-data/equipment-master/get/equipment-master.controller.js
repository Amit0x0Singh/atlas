import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'

const clampInt = (val, fallback, min = 1) => {
  const n = parseInt(val, 10)
  return Number.isFinite(n) && n >= min ? n : fallback
}

export const listEquipment = async (req, res) => {
  try {
    const { equipCode, equipName, operation, plant } = req.query
    // Pagination is opt-in — plenty of existing callers (dropdowns/pickers
    // elsewhere in the app) hit this endpoint expecting the full list back
    // with no page/limit at all, and must keep getting exactly that.
    const paginate = req.query.page !== undefined || req.query.limit !== undefined
    const page  = clampInt(req.query.page, 1)
    const limit = clampInt(req.query.limit, 15)

    const where = {
      ...(equipCode ? { equipCode: { contains: equipCode, mode: 'insensitive' } } : {}),
      ...(equipName ? { equipName: { contains: equipName, mode: 'insensitive' } } : {}),
      // Operation/Plant are picked from a dropdown of actual existing values
      // (see listEquipmentFilterMeta) — exact match, not a text search.
      ...(operation ? { operation: { equals: operation, mode: 'insensitive' } } : {}),
      ...(plant     ? { plant:     { equals: plant,     mode: 'insensitive' } } : {}),
    }

    const [total, items] = await Promise.all([
      prisma.equipmentMaster.count({ where }),
      prisma.equipmentMaster.findMany({
        where, orderBy: { equipName: 'asc' },
        ...(paginate ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
    ])

    return res.json({ success: true, data: items, total, page, limit: paginate ? limit : total })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Powers the Operation/Plant filter dropdowns with whatever values are
// actually in use today, rather than a hardcoded (and easily stale) list.
export const listEquipmentFilterMeta = async (req, res) => {
  try {
    const [operations, plants] = await Promise.all([
      prisma.equipmentMaster.findMany({ distinct: ['operation'], select: { operation: true }, where: { operation: { not: '' } } }),
      prisma.equipmentMaster.findMany({ distinct: ['plant'],     select: { plant: true },     where: { plant: { not: '' } } }),
    ])
    return res.json({
      success: true,
      data: {
        operations: operations.map(o => o.operation).sort(),
        plants:     plants.map(p => p.plant).sort(),
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
