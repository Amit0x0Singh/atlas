import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { toSafeErrorMessage } from '../../../utils/safe-error.js'

const TYPES = ['PRIMARY', 'SECONDARY']

export const createItem = async (req, res) => {
  const { name, itemCode } = req.body
  const type = String(req.body.type || '').toUpperCase()

  if (!name || !itemCode)
    return res.status(400).json({ success: false, error: 'name and itemCode are required', code: 'VALIDATION_ERROR' })
  if (!TYPES.includes(type))
    return res.status(400).json({ success: false, error: 'type must be PRIMARY or SECONDARY', code: 'VALIDATION_ERROR' })

  try {
    const item = await prisma.packingItem.create({
      data: { name: name.trim(), itemCode: itemCode.trim(), type, createdBy: auditUser(req).username, updatedBy: auditUser(req).username },
    })
    await writeAudit({
      ...auditUser(req), action: 'CREATE_PACKING_ITEM', tableName: 'PackingItem', recordId: item.id,
      newValue: { itemCode: item.itemCode, name: item.name, type: item.type },
    })
    return res.status(201).json({ success: true, data: item })
  } catch (err) {
    if (err.code === 'P2002')
      return res.status(400).json({ success: false, error: `Item code "${itemCode}" already exists`, code: 'VALIDATION_ERROR' })
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
