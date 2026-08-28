import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { toSafeErrorMessage } from '../../../utils/safe-error.js'

const TYPES = ['PRIMARY', 'SECONDARY']

export const updateItem = async (req, res) => {
  const { id } = req.params
  const { name, itemCode } = req.body
  try {
    const existing = await prisma.packingItem.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ success: false, error: 'Packing item not found', code: 'NOT_FOUND' })

    const data = { updatedBy: auditUser(req).username }
    if (name !== undefined) data.name = name.trim()
    if (itemCode !== undefined) data.itemCode = itemCode.trim()
    if (req.body.type !== undefined) {
      const type = String(req.body.type).toUpperCase()
      if (!TYPES.includes(type))
        return res.status(400).json({ success: false, error: 'type must be PRIMARY or SECONDARY', code: 'VALIDATION_ERROR' })
      data.type = type
    }

    const updated = await prisma.packingItem.update({ where: { id }, data })
    await writeAudit({
      ...auditUser(req), action: 'UPDATE_PACKING_ITEM', tableName: 'PackingItem', recordId: id,
      oldValue: { itemCode: existing.itemCode, name: existing.name, type: existing.type },
      newValue: { itemCode: updated.itemCode, name: updated.name, type: updated.type },
    })
    return res.json({ success: true, data: updated })
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(400).json({ success: false, error: `Item code "${itemCode}" already exists`, code: 'VALIDATION_ERROR' })
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Activate/deactivate is the only "removal" path — there is deliberately no
// DELETE route in this module (see admin-router.js), matching the OptionValue
// rule: a packing item already typed onto a historical Sales Order can never
// disappear, only stop being suggested for new ones.
export const setActive = async (req, res) => {
  const { id } = req.params
  const { isActive } = req.body
  if (typeof isActive !== 'boolean')
    return res.status(400).json({ success: false, error: 'isActive (boolean) required', code: 'VALIDATION_ERROR' })
  try {
    const existing = await prisma.packingItem.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ success: false, error: 'Packing item not found', code: 'NOT_FOUND' })

    const updated = await prisma.packingItem.update({
      where: { id },
      data: { isActive, updatedBy: auditUser(req).username },
    })
    await writeAudit({
      ...auditUser(req), action: isActive ? 'ACTIVATE_PACKING_ITEM' : 'DEACTIVATE_PACKING_ITEM', tableName: 'PackingItem', recordId: id,
      oldValue: { isActive: existing.isActive },
      newValue: { isActive: updated.isActive },
    })
    return res.json({ success: true, data: updated })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
