import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'

// ── Suppliers ─────────────────────────────────────────────────────────────────

const clampInt = (val, fallback, min = 1) => {
  const n = parseInt(val, 10)
  return Number.isFinite(n) && n >= min ? n : fallback
}

export const listSuppliers = async (req, res) => {
  try {
    const { supplier_name, phone, email, gstin, address } = req.query
    // Pagination is opt-in — plenty of existing callers (dropdowns/pickers
    // elsewhere in the app) hit this endpoint expecting the full list back
    // with no page/limit at all, and must keep getting exactly that.
    const paginate = req.query.page !== undefined || req.query.limit !== undefined
    const page  = clampInt(req.query.page, 1)
    const limit = clampInt(req.query.limit, 15)

    const where = {
      isActive: true,
      ...(supplier_name ? { supplierName: { contains: supplier_name, mode: 'insensitive' } } : {}),
      ...(phone   ? { phone:   { contains: phone,   mode: 'insensitive' } } : {}),
      ...(email   ? { email:   { contains: email,   mode: 'insensitive' } } : {}),
      ...(gstin   ? { gstin:   { contains: gstin,   mode: 'insensitive' } } : {}),
      ...(address ? { address: { contains: address, mode: 'insensitive' } } : {}),
    }

    const [total, data] = await Promise.all([
      prisma.erpSupplier.count({ where }),
      prisma.erpSupplier.findMany({
        where, orderBy: { supplierName: 'asc' },
        ...(paginate ? { skip: (page - 1) * limit, take: limit } : {}),
      }),
    ])

    return res.json({ success: true, data, total, page, limit: paginate ? limit : total })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// ── Plants ────────────────────────────────────────────────────────────────────

export const listPlants = async (req, res) => {
  try {
    const data = await prisma.erpPlant.findMany({
      where: { isActive: true },
      orderBy: { plantName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// ── Equipment (ERP) ───────────────────────────────────────────────────────────

export const listErpEquipment = async (req, res) => {
  try {
    const { plant_id } = req.query
    const where = {}
    if (plant_id) where.plantId = plant_id

    const rows = await prisma.erpEquipment.findMany({
      where,
      include: { plant: { select: { plantName: true } } },
      orderBy: { equipmentName: 'asc' },
    })
    const data = rows.map(e => ({ ...e, plant_name: e.plant?.plantName ?? null, plant: undefined }))
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// ── Strains ───────────────────────────────────────────────────────────────────

export const listStrains = async (req, res) => {
  try {
    const data = await prisma.microbialStrain.findMany({
      where: { isActive: true },
      orderBy: { strainName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

export const listCustomers = async (req, res) => {
  try {
    const data = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { customerName: 'asc' },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// ── Reason codes ──────────────────────────────────────────────────────────────

export const listReasonCodes = async (req, res) => {
  try {
    const { category } = req.query
    const where = { isActive: true }
    if (category) where.category = category

    const data = await prisma.reasonCode.findMany({
      where,
      orderBy: [{ category: 'asc' }, { label: 'asc' }],
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
