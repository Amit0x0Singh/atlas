import prisma from '../../../../../db.js'
import { flattenPack, packDetailInclude } from '../../../../../services/pack-view.js'

export const listOutward = async (req, res) => {
  try {
    const { itemCode, page = 1, limit = 50 } = req.query
    const where = itemCode ? { rmCode: itemCode } : {}
    const [total, rows] = await Promise.all([
      prisma.outward.count({ where }),
      prisma.outward.findMany({ where, orderBy: { timestamp: 'desc' }, skip: (page-1)*parseInt(limit), take: parseInt(limit) })
    ])
    // Attach rmName + inventoryUom from rmMaster. inventoryUom is the unit
    // qtyIssued is in — needed to label it, and as the display unit for rows
    // written before operationalUom existed (operationalUom null there).
    const rmCodes = [...new Set(rows.map(r => r.rmCode).filter(Boolean))]
    const rmItems = await prisma.rmMaster.findMany({
      where: { itemCode: { in: rmCodes } },
      select: { itemCode: true, itemName: true, inventoryUom: true }
    })
    const rmMap = Object.fromEntries(rmItems.map(r => [r.itemCode, r]))
    const data = rows.map(r => ({
      ...r,
      rmName:       rmMap[r.rmCode]?.itemName     || r.rmCode,
      inventoryUom: rmMap[r.rmCode]?.inventoryUom || null,
    }))
    return res.json({ success: true, data, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// Single-pack lookup by packId (as scanned from the pack's QR code) — identity,
// remaining qty and current warehouse all live on PackDetail now. Used by
// Warehouse Transfer instead of guessing an RM code out of the packId string
// and fetching the wrong item's "available packs" list.
export const getPackDetail = async (req, res) => {
  try {
    const { packId } = req.params
    const pack = await prisma.packDetail.findUnique({ where: { packId }, include: packDetailInclude })
    if (!pack || pack.status !== 'INWARDED') {
      return res.status(404).json({ success: false, error: `Pack "${packId}" not found or not inwarded`, code: 'NOT_FOUND' })
    }
    const flat = flattenPack(pack)
    return res.json({
      success: true,
      data: {
        packId: flat.packId, itemCode: flat.itemCode, itemName: flat.itemName, lotNo: flat.lotNo,
        bagNo: flat.bagNo, uom: flat.uom, supplier: flat.supplier || '',
        totalQty: flat.totalQty, remainingQty: flat.remainingQty, warehouse: flat.warehouse || '',
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// In-progress BOM issuance sessions — read by both the active issuing screen
// (to resume/auto-save) and the BOM Issued history page. Stored server-side
// so the same session is visible from any device/login.
export const listBomSessions = async (req, res) => {
  try {
    const sessions = await prisma.bomIssueSession.findMany({ orderBy: { updatedAt: 'desc' } })
    return res.json({ success: true, data: sessions })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export const getAvailablePacks = async (req, res) => {
  try {
    const packs = await prisma.packDetail.findMany({
      where: { itemCode: req.params.rmCode, status: 'INWARDED', remainingQty: { gt: 0 } },
      orderBy: { packId: 'asc' },
      include: packDetailInclude,
    })
    const data = packs.map(p => {
      const flat = flattenPack(p)
      return {
        packId: flat.packId, itemCode: flat.itemCode, remainingQty: flat.remainingQty, totalQty: flat.totalQty,
        itemName: flat.itemName || '', lotNo: flat.lotNo || '',
        bagNo: flat.bagNo || 0, supplier: flat.supplier || '',
      }
    })
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
