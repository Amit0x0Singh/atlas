import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { decorateIndent, nextIndentNo } from '../shared.js'

const PRIORITIES = ['Normal', 'Urgent', 'Critical']

// Validate + normalise the incoming item lines against RM Master (canonical
// name / uom / category come from the master, never from the client).
async function resolveItems(rawItems) {
  const items = Array.isArray(rawItems) ? rawItems : []
  const cleaned = items
    .map(it => ({ itemCode: String(it.itemCode || '').trim(), requestedQty: parseFloat(it.requestedQty), remarks: (it.remarks || '').trim() }))
    .filter(it => it.itemCode)

  if (cleaned.length === 0) throw new Error('Add at least one item to the indent')

  const codes = [...new Set(cleaned.map(i => i.itemCode))]
  if (codes.length !== cleaned.length) throw new Error('The same item appears more than once')

  const masters = await prisma.rmMaster.findMany({ where: { itemCode: { in: codes } } })
  const byCode = new Map(masters.map(m => [m.itemCode, m]))

  return cleaned.map((it, idx) => {
    const rm = byCode.get(it.itemCode)
    if (!rm) throw new Error(`Row ${idx + 1}: item "${it.itemCode}" is not in Item Master`)
    if (!it.requestedQty || isNaN(it.requestedQty) || it.requestedQty <= 0)
      throw new Error(`Row ${idx + 1}: quantity must be greater than zero`)
    return {
      itemCode:     rm.itemCode,
      itemName:     rm.itemName,
      category:     rm.category || null,
      subCategory:  rm.subCategory || null,
      uom:          rm.operationalUom || rm.inventoryUom,
      // 12 significant figures — trims float noise without flooring a
      // legitimately small requested qty to 0.
      requestedQty: Number(it.requestedQty.toPrecision(12)),
      remarks:      it.remarks || null,
    }
  })
}

// The requester's department is taken from their account (users.department),
// never the request body — an account with no department set can't raise an
// indent. The label comes from the MATERIAL_INDENT_DEPARTMENT option group,
// falling back to the code itself if it isn't a listed value.
async function resolveDepartment(user) {
  const code = String(user?.department || '').trim()
  if (!code) {
    throw new Error('Your account has no department assigned. Ask an admin to set it on your User account before raising indents.')
  }
  const group = await prisma.optionGroup.findUnique({ where: { groupCode: 'MATERIAL_INDENT_DEPARTMENT' } })
  const value = group
    ? await prisma.optionValue.findFirst({ where: { groupId: group.id, code, isActive: true } })
    : null
  return { departmentCode: code, departmentName: value?.label || code }
}

// Priority + remarks come from the form; department is server-derived.
function validateHeader(body) {
  const priority = PRIORITIES.includes(body.priority) ? body.priority : 'Normal'
  if (priority === 'Critical' && !String(body.criticalReason || '').trim())
    throw new Error('Provide a reason for Critical priority')
  return {
    priority,
    criticalReason: priority === 'Critical' ? String(body.criticalReason).trim() : null,
    overallRemarks: String(body.overallRemarks || '').trim() || null,
  }
}

// Snapshot of who is raising this — full name for display, plants[] for the
// plant-scoped "My Plant Indents" listing. Both come from the account, never
// the request body.
function requesterSnapshot(user) {
  return {
    requesterName: String(user?.full_name || '').trim() || null,
    requesterPlants: Array.isArray(user?.plants) ? user.plants : [],
  }
}

// POST /material-indent   body: { priority?, criticalReason?, overallRemarks?, items[], submit?: boolean }
export const createIndent = async (req, res) => {
  try {
    const submit = req.body.submit === true || req.body.status === 'OPEN'
    const dept   = await resolveDepartment(req.user)
    const header = validateHeader(req.body)
    const items  = await resolveItems(req.body.items)
    const year   = new Date().getFullYear()

    const created = await prisma.$transaction(async (tx) => {
      const indentNo = submit ? await nextIndentNo(tx, dept.departmentCode) : null
      return tx.materialIndent.create({
        data: {
          ...dept,
          ...header,
          ...requesterSnapshot(req.user),
          year,
          indentNo,
          status: submit ? 'OPEN' : 'DRAFT',
          submittedAt: submit ? new Date() : null,
          items: { create: items },
        },
        include: { items: true },
      })
    })

    return res.status(201).json({ success: true, data: decorateIndent(created) })
  } catch (err) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(err), code: 'VALIDATION_ERROR' })
  }
}

// PUT /material-indent/:id   — edit a still-DRAFT indent, optionally submitting it.
export const updateIndent = async (req, res) => {
  try {
    const existing = await prisma.materialIndent.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    if (existing.status !== 'DRAFT')
      return res.status(409).json({ success: false, error: 'Only draft indents can be edited', code: 'CONFLICT' })
    if (existing.createdBy && existing.createdBy !== req.user?.email)
      return res.status(403).json({ success: false, error: 'You can only edit your own drafts', code: 'FORBIDDEN' })

    const submit = req.body.submit === true || req.body.status === 'OPEN'
    const dept   = await resolveDepartment(req.user)
    const header = validateHeader(req.body)
    const items  = await resolveItems(req.body.items)

    const updated = await prisma.$transaction(async (tx) => {
      await tx.materialIndentItem.deleteMany({ where: { indentId: existing.id } })
      const indentNo = submit ? await nextIndentNo(tx, dept.departmentCode) : null
      return tx.materialIndent.update({
        where: { id: existing.id },
        data: {
          ...dept,
          ...header,
          ...requesterSnapshot(req.user),
          indentNo,
          status: submit ? 'OPEN' : 'DRAFT',
          submittedAt: submit ? new Date() : null,
          items: { create: items },
        },
        include: { items: true },
      })
    })

    return res.json({ success: true, data: decorateIndent(updated) })
  } catch (err) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(err), code: 'VALIDATION_ERROR' })
  }
}
