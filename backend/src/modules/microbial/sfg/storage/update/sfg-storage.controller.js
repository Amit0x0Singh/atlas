import prisma from '../../../../../db.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'
import { slotCode } from '../../shared/status.js'

// Frees the container's rack/shelf/side/position slot and hides it from the
// Storage Map + issuance FEFO picking, while every past inward/outward record
// stays fully intact and searchable — ported from microbe.HTM's
// markContainerInactive(). Does not touch balance or history.
export const markContainerInactive = async (req, res) => {
  try {
    const container = await prisma.microbialSfgContainer.findUnique({ where: { containerId: req.params.id } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })

    const snapshotLocation = container.rack ? slotCode(container.rack, container.shelf, container.side, container.position) : container.location

    const updated = await prisma.microbialSfgContainer.update({
      where: { containerId: container.containerId },
      data: { inactive: true, inactiveLocation: snapshotLocation, location: null, rack: null, shelf: null, side: null, position: null },
    })
    return res.json({ success: true, data: toSnakeRow(updated) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Reactivating does NOT auto-restore the old slot (it may be occupied by
// someone else's container by now) — a fresh slot must be assigned via a
// new inward entry, same as the prototype.
export const reactivateContainer = async (req, res) => {
  try {
    const container = await prisma.microbialSfgContainer.findUnique({ where: { containerId: req.params.id } })
    if (!container) return res.status(404).json({ success: false, error: 'Container not found', code: 'NOT_FOUND' })
    if (!container.inactive) return res.status(400).json({ success: false, error: 'Container is already active', code: 'VALIDATION_ERROR' })

    const updated = await prisma.microbialSfgContainer.update({
      where: { containerId: container.containerId },
      data: { inactive: false },
    })
    return res.json({ success: true, data: toSnakeRow(updated) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
