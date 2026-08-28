import prisma from '../../../db.js'
import { toSafeErrorMessage } from '../../../utils/safe-error.js'

const TYPES = ['PRIMARY', 'SECONDARY']

// ── Public (any authenticated user): active packing items, optionally
// filtered by type — this is what the Sales Order line-item form's
// Primary/Secondary Pack <datalist>s fetch. ─────────────────────────────────
export const listPublic = async (req, res) => {
  try {
    const type = String(req.query.type || '').toUpperCase()
    const where = { isActive: true }
    if (TYPES.includes(type)) where.type = type

    const data = await prisma.packingItem.findMany({
      where,
      orderBy: { name: 'asc' },
      select: { itemCode: true, name: true, type: true },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// ── Admin: every packing item (including inactive), for the Settings
// management table which needs to see and toggle inactive rows. ─────────────
export const listAdmin = async (req, res) => {
  try {
    const data = await prisma.packingItem.findMany({
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
