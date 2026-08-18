import prisma from '../../../../../db.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'
import { RACKS, SHELVES, SIDES, POSITIONS, TOTAL_SLOTS, containerStatus, slotCode } from '../../shared/status.js'

async function loadOccupiedSlots() {
  const containers = await prisma.microbialSfgContainer.findMany({
    where: { rack: { not: null }, shelf: { not: null }, side: { not: null }, position: { not: null } },
    include: { inwards: true },
  })
  const bySlot = {}
  for (const c of containers) {
    const balance = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    const status = containerStatus(balance, c.inwards)
    bySlot[slotCode(c.rack, c.shelf, c.side, c.position)] = {
      containerId: c.containerId,
      containerCode: c.containerCode,
      microbeCode: c.microbeCode,
      microbeName: c.microbeName,
      microbeType: c.microbeType,
      balanceKg: balance,
      status,
      createdBy: c.createdBy,
      updatedBy: c.updatedBy,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }
  }
  return bySlot
}

// Full 15-rack x 8-shelf x 2-side x 3-position (=720) grid — matches
// microbe.HTM's Storage Map exactly, but backed by real rack/shelf/side/
// position columns instead of a parsed free-text string.
export const getStorageGrid = async (req, res) => {
  try {
    const bySlot = await loadOccupiedSlots()
    const racks = []
    let occupied = 0
    let nearExpiry = 0
    let expired = 0

    for (let r = 1; r <= RACKS; r++) {
      const shelves = []
      let rackOccupied = 0
      for (let s = 1; s <= SHELVES; s++) {
        const rows = []
        for (const side of SIDES) {
          const cells = []
          for (const pos of POSITIONS) {
            const code = slotCode(r, s, side, pos)
            const info = bySlot[code]
            if (info) {
              rackOccupied++
              occupied++
              if (info.status === 'Near Expiry') nearExpiry++
              if (info.status === 'Expired') expired++
            }
            cells.push({ slot_code: code, ...(info || null) })
          }
          rows.push({ side, cells })
        }
        shelves.push({ shelf: s, rows })
      }
      racks.push({ rack: r, rack_label: String(r).padStart(2, '0'), occupied: rackOccupied, slots: 48, pct: Math.round((rackOccupied / 48) * 100), shelves })
    }

    return res.json({
      success: true,
      data: toSnakeRow({
        racks,
        summary: { occupied, totalSlots: TOTAL_SLOTS, occupancyPct: Number(((occupied / TOTAL_SLOTS) * 100).toFixed(1)), nearExpiry, expired },
      }),
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Free slots for the new-container location picker — optionally excluding
// the slot already held by `exclude_container_id` (editing its own slot).
export const getAvailableSlots = async (req, res) => {
  try {
    const { exclude_container_id } = req.query
    const occupiedContainers = await prisma.microbialSfgContainer.findMany({
      where: {
        rack: { not: null }, shelf: { not: null }, side: { not: null }, position: { not: null },
        ...(exclude_container_id ? { containerId: { not: exclude_container_id } } : {}),
      },
      select: { rack: true, shelf: true, side: true, position: true },
    })
    const occupied = new Set(occupiedContainers.map((c) => slotCode(c.rack, c.shelf, c.side, c.position)))

    const slots = []
    for (let r = 1; r <= RACKS; r++) {
      for (let s = 1; s <= SHELVES; s++) {
        for (const side of SIDES) {
          for (const pos of POSITIONS) {
            const code = slotCode(r, s, side, pos)
            if (!occupied.has(code)) slots.push({ slot_code: code, rack: r, shelf: s, side, position: pos })
          }
        }
      }
    }
    return res.json({ success: true, data: slots })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
