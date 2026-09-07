import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { decorateIndent, canSeeAllIndents, attachRmUom } from '../shared.js'

// GET /material-indent
// Query: scope (informational only now), status, priority, department,
// dateFrom, dateTo, q, page, limit.
//
// Visibility is capability-driven, NOT taken from the `scope` param
// (see canSeeAllIndents):
//   • The Store (inventory.outward.create / inventory.material-indent.issue)
//     and admins (admin.panel.access) see every indent, and may narrow with
//     ?department= — this is the Store's Open Indents / Indent History queue
//     and the admin "All Indents" view.
//   • Everyone else (plant / section requesters) is confined to indents raised
//     by someone from THEIR OWN plant(s) — a Nano-plant person only ever sees
//     Nano-plant requests, a Botanical person only Botanical, etc. — whatever
//     `scope` they pass. A requester belonging to no plant sees only the
//     indents they raised themselves.
//
// `status` accepts a comma list ("OPEN,PARTIAL") or the alias "active"
// (OPEN + PARTIAL) / "history" (COMPLETED + REJECTED + CANCELLED).
export const listIndents = async (req, res) => {
  try {
    const {
      status, priority, department,
      dateFrom, dateTo, q, page = 1, limit = 50,
    } = req.query

    const canSeeAll = canSeeAllIndents(req.user)

    const where = {}
    if (!canSeeAll) {
      // Requester — locked to their own plant(s). A user with no plant falls
      // back to just the indents they raised. Any client filter is ignored.
      const plants = Array.isArray(req.user?.plants) ? req.user.plants.filter(Boolean) : []
      if (plants.length) where.requesterPlants = { hasSome: plants }
      else where.createdBy = req.user?.email || '__none__'
    } else if (department) {
      where.departmentCode = department
    }

    if (status === 'active')       where.status = { in: ['OPEN', 'PARTIAL'] }
    else if (status === 'history') where.status = { in: ['COMPLETED', 'REJECTED', 'CANCELLED'] }
    else if (status)               where.status = { in: String(status).split(',').map(s => s.trim()).filter(Boolean) }

    if (priority) where.priority = priority

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) where.createdAt.gte = new Date(dateFrom)
      if (dateTo)   where.createdAt.lte = new Date(`${dateTo}T23:59:59.999`)
    }

    if (q) {
      const term = String(q).trim()
      where.OR = [
        { indentNo:       { contains: term, mode: 'insensitive' } },
        { departmentName: { contains: term, mode: 'insensitive' } },
        { requesterName:  { contains: term, mode: 'insensitive' } },
        { createdBy:      { contains: term, mode: 'insensitive' } },
        { items: { some: { itemName: { contains: term, mode: 'insensitive' } } } },
        { items: { some: { itemCode: { contains: term, mode: 'insensitive' } } } },
      ]
    }

    const take = Math.min(parseInt(limit) || 50, 200)
    const skip = ((parseInt(page) || 1) - 1) * take

    const [total, rows] = await Promise.all([
      prisma.materialIndent.count({ where }),
      prisma.materialIndent.findMany({
        where, orderBy: { updatedAt: 'desc' }, skip, take,
        include: { items: { orderBy: { createdAt: 'asc' } } },
      }),
    ])

    return res.json({ success: true, data: rows.map(decorateIndent), total, page: parseInt(page) || 1, limit: take })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// GET /material-indent/:id
export const getIndent = async (req, res) => {
  try {
    const indent = await prisma.materialIndent.findUnique({
      where: { id: req.params.id },
      include: { items: { orderBy: { createdAt: 'asc' } } },
    })
    if (!indent) return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })

    // A requester may only open an indent raised by their own plant; the
    // Store and admins can open any. 404 (not 403) so a stray id doesn't
    // confirm another plant's indent exists.
    const myPlants = Array.isArray(req.user?.plants) ? req.user.plants.filter(Boolean) : []
    const samePlant = (indent.requesterPlants || []).some(p => myPlants.includes(p))
    if (!canSeeAllIndents(req.user) && !samePlant && indent.createdBy !== req.user?.email) {
      return res.status(404).json({ success: false, error: 'Indent not found', code: 'NOT_FOUND' })
    }

    return res.json({ success: true, data: await attachRmUom(decorateIndent(indent)) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
