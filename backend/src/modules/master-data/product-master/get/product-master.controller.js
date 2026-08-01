import prisma from '../../../../db.js'

const clampInt = (val, fallback, min = 1) => {
  const n = parseInt(val, 10)
  return Number.isFinite(n) && n >= min ? n : fallback
}

export const listProducts = async (req, res) => {
  try {
    const { productCode, productName, plant } = req.query
    // Pagination is opt-in — plenty of existing callers (dropdowns/pickers
    // elsewhere in the app) hit this endpoint expecting the full list back
    // with no page/limit at all, and must keep getting exactly that.
    const paginate = req.query.page !== undefined || req.query.limit !== undefined
    const page  = clampInt(req.query.page, 1)
    const limit = clampInt(req.query.limit, 15)

    const where = {
      ...(productCode ? { productCode: { contains: productCode, mode: 'insensitive' } } : {}),
      ...(productName ? { productName: { contains: productName, mode: 'insensitive' } } : {}),
      // plant is a String[] column — `has` matches rows whose array contains
      // this exact value (case-sensitive, but the dropdown only ever offers
      // values that already exist verbatim, via listProductFilterMeta).
      ...(plant ? { plant: { has: plant } } : {}),
    }

    const [total, items] = await Promise.all([
      prisma.productMaster.count({ where }),
      prisma.productMaster.findMany({
        where, orderBy: { productName: 'asc' },
        ...(paginate ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
    ])

    return res.json({ success: true, data: items, total, page, limit: paginate ? limit : total })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Powers the Plant filter dropdown — Prisma can't `distinct` on individual
// elements of an array column, so this flattens/dedupes in JS instead.
export const listProductFilterMeta = async (req, res) => {
  try {
    const rows = await prisma.productMaster.findMany({ select: { plant: true } })
    const plants = [...new Set(rows.flatMap(r => r.plant || []))].sort()
    return res.json({ success: true, data: { plants } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getProduct = async (req, res) => {
  try {
    const item = await prisma.productMaster.findUnique({ where: { productCode: req.params.productCode } })
    if (!item) return res.status(404).json({ success: false, error: 'Product not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: item })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
