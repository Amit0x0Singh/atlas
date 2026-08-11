import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'

export const updateValue = async (req, res) => {
  const { id } = req.params
  const { code, label } = req.body
  try {
    const existing = await prisma.optionValue.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ success: false, error: 'Option not found', code: 'NOT_FOUND' })

    const data = {}
    if (code !== undefined) data.code = code.trim()
    if (label !== undefined) data.label = label.trim()

    const updated = await prisma.optionValue.update({ where: { id }, data })
    await writeAudit({
      ...auditUser(req), action: 'UPDATE_OPTION', tableName: 'OptionValue', recordId: id,
      oldValue: { code: existing.code, label: existing.label },
      newValue: { code: updated.code, label: updated.label },
    })
    return res.json({ success: true, data: updated })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: `Option "${code}" already exists in this group`, code: 'VALIDATION_ERROR' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Activate/deactivate is the only "removal" path — there is deliberately no
// DELETE route anywhere in this module (see router.js), so an option already
// referenced by historical records can never disappear from the DB, only
// stop being offered for new ones.
export const setActive = async (req, res) => {
  const { id } = req.params
  const { isActive } = req.body
  if (typeof isActive !== 'boolean')
    return res.status(400).json({ success: false, error: 'isActive (boolean) required', code: 'VALIDATION_ERROR' })
  try {
    const existing = await prisma.optionValue.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ success: false, error: 'Option not found', code: 'NOT_FOUND' })

    const updated = await prisma.optionValue.update({ where: { id }, data: { isActive } })
    await writeAudit({
      ...auditUser(req), action: isActive ? 'ACTIVATE_OPTION' : 'DEACTIVATE_OPTION', tableName: 'OptionValue', recordId: id,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive: updated.isActive },
    })
    return res.json({ success: true, data: updated })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Batch reorder — { order: [{ code, sortOrder }, ...] } for every value in
// the group at once, so drag/up-down reordering in the UI commits in a
// single call instead of N separate requests.
export const reorderValues = async (req, res) => {
  const { groupCode } = req.params
  const { order } = req.body
  if (!Array.isArray(order) || order.length === 0)
    return res.status(400).json({ success: false, error: 'order (array of {code, sortOrder}) required', code: 'VALIDATION_ERROR' })
  try {
    const group = await prisma.optionGroup.findUnique({ where: { groupCode }, include: { values: true } })
    if (!group) return res.status(404).json({ success: false, error: 'Option group not found', code: 'NOT_FOUND' })

    const byCode = new Map(group.values.map((v) => [v.code, v]))
    const oldOrder = order.map(({ code }) => ({ code, sortOrder: byCode.get(code)?.sortOrder ?? null }))

    await prisma.$transaction(
      order
        .filter(({ code }) => byCode.has(code))
        .map(({ code, sortOrder }) => prisma.optionValue.update({ where: { id: byCode.get(code).id }, data: { sortOrder } }))
    )

    await writeAudit({
      ...auditUser(req), action: 'REORDER_OPTIONS', tableName: 'OptionValue', recordId: group.id,
      oldValue: { groupCode, order: oldOrder },
      newValue: { groupCode, order },
    })
    const refreshed = await prisma.optionValue.findMany({ where: { groupId: group.id }, orderBy: { sortOrder: 'asc' } })
    return res.json({ success: true, data: refreshed })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
