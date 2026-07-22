import prisma from '../../../../../db.js'
import { toSnakeRow } from '../../../../../utils/caseTransform.js'
import { containerStatus, daysLeft, expiryOf, SLOTS_PER_RACK } from '../../shared/status.js'

function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

// ── Reorder Signals ──────────────────────────────────────────────────────────
// avg/month over the actual data window (first-ever issuance -> today), so
// accuracy doesn't depend on how long the system has been in live use.
// Ported from microbe.HTM's renderAnalytics() reorder-signals block.
function computeReorderSignals(containers, outwardLines) {
  const now = new Date()
  const stockMap = {}
  const nameMap = {}
  const typeMap = {}
  for (const c of containers) {
    const bal = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    stockMap[c.microbeCode] = (stockMap[c.microbeCode] || 0) + bal
    nameMap[c.microbeCode] = c.microbeName
    typeMap[c.microbeCode] = c.microbeType
  }

  const allDates = outwardLines.map((l) => new Date(l.outward.issuedAt)).filter((d) => !isNaN(d))
  const firstDate = allDates.length ? new Date(Math.min(...allDates)) : now
  const windowDays = Math.max(1, Math.ceil((now - firstDate) / 86400000))
  const windowMonths = windowDays / 30

  const byMicrobe = {}
  for (const l of outwardLines) byMicrobe[l.microbeCode] = (byMicrobe[l.microbeCode] || 0) + Number(l.qtyIssuedKg)

  const rows = Object.entries(byMicrobe).map(([microbeCode, totalKg]) => {
    const avgPerMonth = totalKg / windowMonths
    const avgPerDay = avgPerMonth / 30
    const stock = stockMap[microbeCode] || 0
    const daysCover = avgPerMonth > 0 ? Math.round((stock / avgPerMonth) * 30) : null
    let signal, action, signalColor
    if (daysCover === null || stock < 0.001) { signal = 'Out of Stock'; signalColor = '#991b1b'; action = 'Order immediately — no stock available' }
    else if (daysCover <= 15) { signal = 'Critical'; signalColor = '#991b1b'; action = 'Order within 1 week — less than 15 days cover' }
    else if (daysCover <= 30) { signal = 'Reorder Now'; signalColor = '#c2410c'; action = 'Place purchase order — less than 30 days cover' }
    else if (daysCover <= 60) { signal = 'Watch'; signalColor = '#92400e'; action = 'Monitor — plan procurement in 2–3 weeks' }
    else { signal = 'OK'; signalColor = '#166534'; action = 'Adequate stock — no action needed' }
    return { microbeCode, microbeName: nameMap[microbeCode] || microbeCode, microbeType: typeMap[microbeCode] || '—', avgPerMonth, avgPerDay, totalKg, stock, daysCover, signal, signalColor, action, windowMonths, windowDays }
  }).sort((a, b) => (a.daysCover ?? -1) - (b.daysCover ?? -1))

  return rows
}

// ── FEFO queue ────────────────────────────────────────────────────────────────
function computeFefoQueue(containers) {
  const rows = []
  for (const c of containers) {
    const active = c.inwards.filter((i) => Number(i.remainingQtyKg) > 0.001)
    if (!active.length) continue
    const balance = active.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    const soonest = active.map((i) => ({ i, expiry: expiryOf(i) })).sort((a, b) => (a.expiry ?? Infinity) - (b.expiry ?? Infinity))[0]
    rows.push({
      containerId: c.containerId, containerCode: c.containerCode, microbeName: c.microbeName, microbeCode: c.microbeCode,
      location: c.location || '—', balanceKg: balance, expiryDate: soonest.expiry, daysToExpiry: daysLeft(soonest.expiry),
    })
  }
  return rows.sort((a, b) => (a.daysToExpiry ?? 99999) - (b.daysToExpiry ?? 99999))
}

// ── Dormant microbes: live stock, no issuance in 90 days (or ever) ──────────
function computeDormant(containers, outwardLines) {
  const now = new Date()
  const ninetyAgo = new Date(now); ninetyAgo.setDate(ninetyAgo.getDate() - 90)
  const lastIssueByMicrobe = {}
  for (const l of outwardLines) {
    const d = new Date(l.outward.issuedAt)
    if (!lastIssueByMicrobe[l.microbeCode] || d > lastIssueByMicrobe[l.microbeCode]) lastIssueByMicrobe[l.microbeCode] = d
  }
  const stockByMicrobe = {}
  const nameMap = {}
  for (const c of containers) {
    const bal = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    stockByMicrobe[c.microbeCode] = (stockByMicrobe[c.microbeCode] || 0) + bal
    nameMap[c.microbeCode] = c.microbeName
  }
  const out = []
  for (const [microbeCode, stock] of Object.entries(stockByMicrobe)) {
    if (stock <= 0.001) continue
    const last = lastIssueByMicrobe[microbeCode]
    if (!last) out.push({ microbeCode, microbeName: nameMap[microbeCode], stock, lastIssued: null, daysSince: null, never: true })
    else if (last < ninetyAgo) out.push({ microbeCode, microbeName: nameMap[microbeCode], stock, lastIssued: last, daysSince: Math.floor((now - last) / 86400000), never: false })
  }
  return out.sort((a, b) => (b.daysSince ?? 99999) - (a.daysSince ?? 99999))
}

// ── Rack utilization (congestion / under-utilization) ────────────────────────
function computeRackUtilization(containers) {
  const byRack = {}
  for (const c of containers) {
    if (!c.rack) continue
    const bal = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    if (bal <= 0.001) continue
    byRack[c.rack] = (byRack[c.rack] || 0) + 1
  }
  const rows = Object.entries(byRack).map(([rack, occupied]) => ({ rack: Number(rack), occupied, pct: (occupied / SLOTS_PER_RACK) * 100 })).sort((a, b) => b.pct - a.pct)
  return { rows, congested: rows.filter((r) => r.pct >= 90), underutilized: rows.filter((r) => r.occupied > 0 && r.pct <= 15) }
}

// ── Merge candidates: 2+ partial containers of the same microbe ────────────
function computeMergeCandidates(containers) {
  const withSlot = containers.filter((c) => c.rack)
  const byMicrobe = {}
  for (const c of withSlot) {
    const bal = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    if (bal <= 0.001) continue
    ;(byMicrobe[c.microbeCode] = byMicrobe[c.microbeCode] || []).push({ c, bal })
  }
  const out = []
  for (const [microbeCode, list] of Object.entries(byMicrobe)) {
    if (list.length < 2) continue
    const typicalQtys = list.flatMap((l) => l.c.inwards.map((i) => Number(i.totalQtyKg))).filter((n) => n > 0)
    if (!typicalQtys.length) continue
    const sorted = typicalQtys.slice().sort((a, b) => a - b)
    const median = sorted[Math.floor(sorted.length / 2)]
    const partial = list.filter((l) => l.bal < median * 0.2)
    if (partial.length >= 2) {
      out.push({
        microbeCode, microbeName: list[0].c.microbeName,
        containers: partial.map((l) => ({ code: l.c.containerCode, balanceKg: l.bal, location: l.c.location })),
        combinedKg: partial.reduce((s, l) => s + l.bal, 0), slotsFreed: partial.length - 1, typicalFullKg: median,
      })
    }
  }
  return out.sort((a, b) => b.slotsFreed - a.slotsFreed)
}

// ── Health Score = 100 - avg(Procurement Risk %, Expiry Risk %, Dormancy %) ─
function computeHealth(containers, reorderRows, dormant) {
  const totalMicrobes = reorderRows.length || 1
  const atRisk = reorderRows.filter((r) => r.signal === 'Critical' || r.signal === 'Out of Stock' || r.signal === 'Reorder Now').length
  const procurementRiskPct = Math.round((atRisk / totalMicrobes) * 100)

  const allBatches = containers.flatMap((c) => c.inwards).filter((i) => Number(i.remainingQtyKg) > 0.001)
  const totalBatches = allBatches.length || 1
  const expRisk = allBatches.filter((i) => { const d = daysLeft(expiryOf(i)); return d !== null && d <= 30 }).length
  const expiryRiskPct = Math.round((expRisk / totalBatches) * 100)

  const stockedMicrobes = new Set(containers.filter((c) => c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0) > 0.001).map((c) => c.microbeCode))
  const microbeCount = stockedMicrobes.size || 1
  const dormancyPct = Math.round((dormant.length / microbeCount) * 100)

  const score = Math.max(0, Math.round(100 - (procurementRiskPct + expiryRiskPct + dormancyPct) / 3))
  return { score, procurementRiskPct, expiryRiskPct, dormancyPct, atRisk, totalMicrobes, expRisk, totalBatches, dormantCount: dormant.length }
}

// ── Consumption velocity: top 8 microbes by all-time issued kg, with a
// recent-vs-prior-period trend arrow ──────────────────────────────────────
function computeVelocity(outwardLines) {
  const now = new Date()
  const sixAgo = new Date(now); sixAgo.setMonth(sixAgo.getMonth() - 6)
  const threeAgo = new Date(now); threeAgo.setMonth(threeAgo.getMonth() - 3)

  const byMicrobe = {}
  const nameMap = {}
  for (const l of outwardLines) {
    byMicrobe[l.microbeCode] = (byMicrobe[l.microbeCode] || 0) + Number(l.qtyIssuedKg)
    nameMap[l.microbeCode] = l.microbeName
  }
  const priorByMicrobe = {}
  for (const l of outwardLines) {
    const d = new Date(l.outward.issuedAt)
    if (d >= sixAgo && d < threeAgo) priorByMicrobe[l.microbeCode] = (priorByMicrobe[l.microbeCode] || 0) + Number(l.qtyIssuedKg)
  }

  const top8 = Object.entries(byMicrobe).sort((a, b) => b[1] - a[1]).slice(0, 8)
  const maxV = top8.length ? top8[0][1] : 1

  return top8.map(([microbeCode, total]) => {
    const prior = priorByMicrobe[microbeCode] || 0
    const arrow = prior === 0 ? '' : total > prior * 1.15 ? 'up' : total < prior * 0.85 ? 'down' : 'flat'
    const orderIds = new Set(outwardLines.filter((l) => l.microbeCode === microbeCode && new Date(l.outward.issuedAt) >= threeAgo).map((l) => l.outwardId))
    return { microbeCode, microbeName: nameMap[microbeCode], totalKg: total, trend: arrow, orders: orderIds.size, barPct: (total / maxV) * 100 }
  })
}

// ── ABC classification (last 6 months' consumption) + expiry risk % ─────────
function computeAbc(outwardLines, containers) {
  const now = new Date()
  const sixAgo = new Date(now); sixAgo.setMonth(sixAgo.getMonth() - 6)
  const recent = outwardLines.filter((l) => new Date(l.outward.issuedAt) >= sixAgo)

  const byMicrobe = {}
  for (const l of recent) byMicrobe[l.microbeCode] = (byMicrobe[l.microbeCode] || 0) + Number(l.qtyIssuedKg)
  const sorted = Object.entries(byMicrobe).sort((a, b) => b[1] - a[1])
  const totalIssued = sorted.reduce((s, [, v]) => s + v, 0) || 1

  let cumPct = 0
  const abcMap = {}
  for (const [m, v] of sorted) { cumPct += (v / totalIssued) * 100; abcMap[m] = cumPct <= 80 ? 'A' : cumPct <= 95 ? 'B' : 'C' }

  const stockMap = {}
  const nameMap = {}
  const expiryRisk = {}
  for (const c of containers) {
    const batches = c.inwards.filter((i) => Number(i.remainingQtyKg) > 0.001)
    const totalBal = batches.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    const riskBal = batches.filter((i) => { const d = daysLeft(expiryOf(i)); return d !== null && d <= 60 }).reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    stockMap[c.microbeCode] = (stockMap[c.microbeCode] || 0) + totalBal
    nameMap[c.microbeCode] = c.microbeName
    if (!expiryRisk[c.microbeCode]) expiryRisk[c.microbeCode] = { total: 0, risk: 0 }
    expiryRisk[c.microbeCode].total += totalBal
    expiryRisk[c.microbeCode].risk += riskBal
  }

  const allMicrobes = [...new Set([...Object.keys(byMicrobe), ...Object.keys(stockMap)])]
  return allMicrobes.map((m) => {
    const consumedRecent = byMicrobe[m] || 0
    const stock = stockMap[m] || 0
    const er = expiryRisk[m]
    const riskPct = er && er.total > 0 ? (er.risk / er.total) * 100 : 0
    return { microbeCode: m, microbeName: nameMap[m] || m, abcClass: abcMap[m] || (stock > 0 ? 'C' : '—'), consumedRecentKg: consumedRecent, stockKg: stock, expiryRiskPct: riskPct }
  }).sort((a, b) => b.consumedRecentKg - a.consumedRecentKg)
}

// ── Slow-moving & at-risk: live stock, no issuance in 90d OR expiry <=60d ───
function computeSlowMoving(containers, outwardLines) {
  const now = new Date()
  const ninetyAgo = new Date(now); ninetyAgo.setMonth(ninetyAgo.getMonth() - 3)
  const recentMicrobes = new Set(outwardLines.filter((l) => new Date(l.outward.issuedAt) >= ninetyAgo).map((l) => l.microbeCode))

  const grouped = {}
  for (const c of containers) {
    if (!grouped[c.microbeCode]) grouped[c.microbeCode] = { microbeCode: c.microbeCode, microbeName: c.microbeName, bal: 0, nextExp: null }
    const g = grouped[c.microbeCode]
    const active = c.inwards.filter((i) => Number(i.remainingQtyKg) > 0.001)
    g.bal += active.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    for (const i of active) {
      const d = expiryOf(i)
      if (d && (!g.nextExp || d < g.nextExp)) g.nextExp = d
    }
  }

  return Object.values(grouped)
    .filter((g) => g.bal > 0.001)
    .map((g) => {
      const dl = g.nextExp ? daysLeft(g.nextExp) : null
      return { ...g, noMovement: !recentMicrobes.has(g.microbeCode), nearExp: dl !== null && dl <= 60, daysToExpiry: dl }
    })
    .filter((g) => g.noMovement || g.nearExp)
    .sort((a, b) => (a.daysToExpiry ?? 9999) - (b.daysToExpiry ?? 9999))
}

export const getExecDashboard = async (req, res) => {
  try {
    const today = startOfToday()

    // Inactive containers are excluded from every active-stock computation
    // below (KPIs, health, reorder, FEFO, rack, merge, velocity, ABC,
    // dormancy) — their history stays fully visible in Stock Summary /
    // Container Ledger instead, matching microbe.HTM's "hidden from Storage
    // Map + issuance, but never deleted" rule.
    const containers = (await prisma.microbialSfgContainer.findMany({ include: { inwards: true } })).filter((c) => !c.inactive)
    const outwardLines = await prisma.microbialSfgOutwardLine.findMany({ include: { outward: true } })

    const reorderSignals = computeReorderSignals(containers, outwardLines)
    const dormant = computeDormant(containers, outwardLines)
    const fefoQueue = computeFefoQueue(containers)
    const rackUtilization = computeRackUtilization(containers)
    const mergeCandidates = computeMergeCandidates(containers)
    const health = computeHealth(containers, reorderSignals, dormant)
    const velocity = computeVelocity(outwardLines)
    const abc = computeAbc(outwardLines, containers)
    const slowMoving = computeSlowMoving(containers, outwardLines)

    // KPIs
    const allBatches = containers.flatMap((c) => c.inwards)
    const totalStockKg = allBatches.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
    const activeContainers = containers.filter((c) => c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0) > 0.001).length
    const expiringSoonCount = allBatches.filter((i) => { const d = daysLeft(expiryOf(i)); return Number(i.remainingQtyKg) > 0.001 && d !== null && d >= 0 && d <= 30 }).length
    const reorderAlerts = reorderSignals.filter((r) => r.signal !== 'OK').length
    const todayInward = await prisma.microbialSfgInward.findMany({ where: { createdAt: { gte: today } }, include: { container: { select: { location: true } } } })
    const todayIssuedLines = outwardLines.filter((l) => new Date(l.createdAt) >= today)
    const todayInwardKg = todayInward.reduce((s, i) => s + Number(i.totalQtyKg), 0)
    const todayIssuedKg = todayIssuedLines.reduce((s, l) => s + Number(l.qtyIssuedKg), 0)

    // Inventory Position — top 10 by balance
    const byMicrobeBalance = {}
    for (const c of containers) {
      const bal = c.inwards.reduce((s, i) => s + Number(i.remainingQtyKg), 0)
      if (!byMicrobeBalance[c.microbeCode]) byMicrobeBalance[c.microbeCode] = { microbeCode: c.microbeCode, microbeName: c.microbeName, balanceKg: 0, containers: 0, nextExpiry: null, batches: [] }
      const g = byMicrobeBalance[c.microbeCode]
      g.balanceKg += bal
      if (bal > 0.001) g.containers += 1
      g.batches.push(...c.inwards.filter((i) => Number(i.remainingQtyKg) > 0.001))
    }
    const inventoryPosition = Object.values(byMicrobeBalance)
      .filter((g) => g.balanceKg > 0)
      .map((g) => ({
        microbeCode: g.microbeCode, microbeName: g.microbeName, balanceKg: g.balanceKg, containers: g.containers,
        nextExpiry: g.batches.map((b) => expiryOf(b)).filter(Boolean).sort((a, b) => a - b)[0] || null,
        status: containerStatus(g.balanceKg, g.batches),
      }))
      .sort((a, b) => b.balanceKg - a.balanceKg)
      .slice(0, 10)

    // Insights feed — cross-category, top urgency first, capped at 6
    const insights = []
    for (const r of reorderSignals.filter((r) => r.signal === 'Critical' || r.signal === 'Out of Stock').slice(0, 3)) {
      insights.push({ icon: 'alert', text: `${r.microbeName} is ${r.signal === 'Out of Stock' ? 'out of stock' : `at ${r.daysCover} days of cover`} — ${r.action}`, kind: 'reorder', ref: r.microbeCode })
    }
    for (const r of fefoQueue.filter((r) => r.daysToExpiry !== null && r.daysToExpiry <= 15).slice(0, 2)) {
      insights.push({ icon: 'expiry', text: `${r.containerCode} (${r.microbeName}) expires in ${r.daysToExpiry}d — issue this container first (FEFO)`, kind: 'fefo', ref: r.containerId })
    }
    if (rackUtilization.congested.length && rackUtilization.underutilized.length) {
      insights.push({ icon: 'rack', text: `Rack ${rackUtilization.congested[0].rack} is ${Math.round(rackUtilization.congested[0].pct)}% full while Rack ${rackUtilization.underutilized[0].rack} is only ${Math.round(rackUtilization.underutilized[0].pct)}% full — consider redistributing new inward stock`, kind: 'rack', ref: null })
    } else if (rackUtilization.congested.length) {
      insights.push({ icon: 'rack', text: `Rack ${rackUtilization.congested[0].rack} is ${Math.round(rackUtilization.congested[0].pct)}% full — approaching capacity`, kind: 'rack', ref: null })
    }
    if (mergeCandidates.length) {
      const m = mergeCandidates[0]
      insights.push({ icon: 'merge', text: `${m.microbeName} has ${m.containers.length} partially-filled containers — merging frees ${m.slotsFreed} rack slot${m.slotsFreed !== 1 ? 's' : ''}`, kind: 'merge', ref: m.microbeCode })
    }
    if (dormant.length) {
      insights.push({ icon: 'dormant', text: `${dormant.length} material${dormant.length !== 1 ? 's' : ''} in stock with no movement in 90+ days — review for write-off or redistribution`, kind: 'dormant', ref: null })
    }

    // Decision cards
    const decisions = {
      procurement: reorderSignals.filter((r) => r.signal !== 'OK').slice(0, 4),
      fefo: fefoQueue.slice(0, 4),
      warehouse: { rackAlert: rackUtilization.congested[0] || null, mergeCandidate: mergeCandidates[0] || null },
    }

    return res.json({
      success: true,
      data: toSnakeRow({
        kpis: { totalStockKg, activeContainers, expiringSoonCount, reorderAlerts, todayInwardKg, todayIssuedKg },
        health,
        insights: insights.slice(0, 6),
        decisions,
        reorderSignals,
        todayInward: todayInward.map((i) => ({ containerCode: i.containerCode, microbeName: i.microbeName, cfuPerG: i.inhouseCfuPerG, qtyKg: i.totalQtyKg, location: i.container?.location || i.location || '—' })),
        todayIssued: todayIssuedLines.map((l) => ({ containerCode: l.containerCode, microbeName: l.microbeName, qtyKg: l.qtyIssuedKg, productName: l.outward?.productName, customerName: l.outward?.customerName })),
        inventoryPosition,
        consumptionVelocity: velocity,
        abcClassification: abc,
        slowMovingAtRisk: slowMoving,
        rackUtilization,
        mergeCandidates,
        fefoQueue: fefoQueue.slice(0, 30),
      }),
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
