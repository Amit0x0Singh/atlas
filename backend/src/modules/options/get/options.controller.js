import prisma from '../../../db.js'

// ── Admin: list every group with its value count, for the Settings > Select
// Options landing page ───────────────────────────────────────────────────────
export const listGroups = async (req, res) => {
  try {
    const groups = await prisma.optionGroup.findMany({
      orderBy: { label: 'asc' },
      include: { _count: { select: { values: true } } },
    })
    return res.json({ success: true, data: groups })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Admin: one group + every value (including inactive) — the management
// table needs to see and toggle inactive rows, unlike the public read below ──
export const getGroup = async (req, res) => {
  try {
    const group = await prisma.optionGroup.findUnique({
      where: { groupCode: req.params.groupCode },
      include: { values: { orderBy: { sortOrder: 'asc' } } },
    })
    if (!group) return res.status(404).json({ success: false, error: 'Option group not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: group })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Public (any authenticated user): active values for one group, in display
// order — this is what every retrofitted <select> across the app fetches ─────
export const listPublicValues = async (req, res) => {
  try {
    const group = await prisma.optionGroup.findUnique({ where: { groupCode: req.params.groupCode } })
    if (!group || !group.isActive) return res.json({ success: true, data: [] })
    const data = await prisma.optionValue.findMany({
      where: { groupId: group.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { code: true, label: true },
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
