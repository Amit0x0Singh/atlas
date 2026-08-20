import prisma from '../../../../../db.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'
import { containerStatus, expiryOf } from '../../shared/status.js'

function fmtCfuAvg(batches) {
  const active = batches.filter((b) => Number(b.remainingQtyKg) > 0.001)
  if (!active.length) return 0
  return active.reduce((s, b) => s + Number(b.inhouseCfuPerG), 0) / active.length
}

function nextExpiryOf(batches) {
  const active = batches.filter((b) => Number(b.remainingQtyKg) > 0.001)
  if (!active.length) return null
  return active
    .map((b) => expiryOf(b))
    .filter(Boolean)
    .sort((a, b) => a - b)[0] || null
}

// "Stock Summary" tab — microbe-wise rollup (every microbe+type combination
// with any stock ever recorded, not just top 10 like the Dashboard's
// Inventory Position widget) ported from microbe.HTM's renderStockMicrobeWise().
export const getMicrobeWiseStockSummary = async (req, res) => {
  try {
    const containers = await prisma.microbialSfgContainer.findMany({ include: { inwards: true } })

    const grouped = {}
    for (const c of containers) {
      const key = `${c.microbeCode}|||${c.microbeType}`
      if (!grouped[key]) {
        grouped[key] = { microbeCode: c.microbeCode, microbeName: c.microbeName, microbeType: c.microbeType, containers: [], totalBalanceKg: 0, batchCount: 0 }
      }
      const g = grouped[key]
      const balance = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
      g.containers.push(c)
      g.totalBalanceKg += balance
      g.batchCount += c.inwards.filter((i) => Number(i.remainingQtyKg) > 0.001).length
    }

    const rows = Object.values(grouped).map((g) => {
      const allBatches = g.containers.flatMap((c) => c.inwards)
      const balance = g.totalBalanceKg
      const status = containerStatus(balance, allBatches)
      return {
        microbeCode: g.microbeCode,
        microbeName: g.microbeName,
        microbeType: g.microbeType,
        containerCount: g.containers.length,
        totalBalanceKg: balance,
        batchCount: g.batchCount,
        avgCfuPerG: fmtCfuAvg(allBatches),
        nextExpiry: nextExpiryOf(allBatches),
        status,
      }
    }).sort((a, b) => b.totalBalanceKg - a.totalBalanceKg)

    return res.json({ success: true, data: toSnakeRow(rows) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// Container Ledger — every container with total-in / total-out / live
// balance / batch count / next expiry / status, ported from renderStock().
export const getContainerLedger = async (req, res) => {
  try {
    const containers = await prisma.microbialSfgContainer.findMany({
      include: { inwards: { include: { outwardLines: true } } },
      orderBy: { containerCode: 'asc' },
    })

    const rows = containers.map((c) => {
      const balance = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
      const totalIn = c.inwards.reduce((s, i) => s + Number(i.totalQtyKg), 0)
      const totalOut = c.inwards.reduce((s, i) => s + i.outwardLines.reduce((s2, l) => s2 + Number(l.qtyIssuedKg), 0), 0)
      const status = containerStatus(balance, c.inwards)
      return {
        containerId: c.containerId,
        containerCode: c.containerCode,
        microbeCode: c.microbeCode,
        microbeName: c.microbeName,
        microbeType: c.microbeType,
        location: c.location,
        rack: c.rack, shelf: c.shelf, side: c.side, position: c.position,
        inactive: c.inactive,
        inactiveLocation: c.inactiveLocation,
        batchCount: c.inwards.length,
        balanceKg: balance,
        totalInKg: totalIn,
        totalOutKg: totalOut,
        nextExpiry: nextExpiryOf(c.inwards),
        status,
      }
    })

    return res.json({ success: true, data: toSnakeRow(rows) })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
