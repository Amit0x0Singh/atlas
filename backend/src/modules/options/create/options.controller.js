import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'

export const createGroup = async (req, res) => {
  const { groupCode, label, description } = req.body
  if (!groupCode || !label)
    return res.status(400).json({ success: false, error: 'groupCode and label required', code: 'VALIDATION_ERROR' })
  try {
    const group = await prisma.optionGroup.create({
      data: { groupCode: groupCode.trim().toUpperCase(), label: label.trim(), description: description?.trim() || null },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE_OPTION_GROUP', tableName: 'OptionGroup', recordId: group.id, newValue: { groupCode: group.groupCode, label: group.label, description: group.description } })
    return res.status(201).json({ success: true, data: group })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: `Group code "${groupCode}" already exists`, code: 'VALIDATION_ERROR' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const createValue = async (req, res) => {
  const { groupCode } = req.params
  const { code, label } = req.body
  if (!code || !label)
    return res.status(400).json({ success: false, error: 'code and label required', code: 'VALIDATION_ERROR' })
  try {
    const group = await prisma.optionGroup.findUnique({ where: { groupCode } })
    if (!group) return res.status(404).json({ success: false, error: 'Option group not found', code: 'NOT_FOUND' })

    const last = await prisma.optionValue.findFirst({ where: { groupId: group.id }, orderBy: { sortOrder: 'desc' } })
    const sortOrder = (last?.sortOrder ?? -1) + 1

    const value = await prisma.optionValue.create({
      data: { groupId: group.id, code: code.trim(), label: label.trim(), sortOrder },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE_OPTION', tableName: 'OptionValue', recordId: value.id, newValue: { groupCode, code: value.code, label: value.label, sortOrder: value.sortOrder } })
    return res.status(201).json({ success: true, data: value })
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ success: false, error: `Option "${code}" already exists in this group`, code: 'VALIDATION_ERROR' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
