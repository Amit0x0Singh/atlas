import prisma from '../db.js'

// Every function below is scoped by (itemCode, lotNo) — i.e. one PrintMaster
// header — instead of an opaque InwardSession id. Scan progress lives
// directly on each PackDetail row's `status`, so "resuming a session" is
// just re-reading the bags for that header; there's nothing separate to
// create or clean up.
async function findHeader(itemCode, lotNo) {
  const header = await prisma.printMaster.findUnique({ where: { itemCode_lotNo: { itemCode, lotNo } } })
  if (!header) throw new Error(`No packs generated for ${itemCode} / lot ${lotNo}`)
  return header
}

// Lots with at least one bag currently SCANNED (mid-scan, not yet submitted)
// — replaces the old "active sessions" list.
export async function getLotsInProgress() {
  const bags = await prisma.packDetail.findMany({
    where: { status: 'SCANNED' },
    select: { itemCode: true, warehouse: true, printMaster: { select: { lotNo: true, itemName: true, numberOfBags: true } } },
  })

  const groups = new Map()
  for (const b of bags) {
    const key = `${b.itemCode}__${b.printMaster.lotNo}`
    if (!groups.has(key))
      groups.set(key, {
        itemCode: b.itemCode, lotNo: b.printMaster.lotNo, itemName: b.printMaster.itemName,
        warehouse: b.warehouse, expectedBags: b.printMaster.numberOfBags,
        scannedCount: 0,
      })
    groups.get(key).scannedCount++
  }
  return [...groups.values()]
}

export async function getLotProgress(itemCode, lotNo) {
  const header = await prisma.printMaster.findUnique({
    where: { itemCode_lotNo: { itemCode, lotNo } },
    include: { gateInward: true, bags: { orderBy: { bagNo: 'asc' } } },
  })
  if (!header) throw new Error(`No packs generated for ${itemCode} / lot ${lotNo}`)

  // Attach the (gateInward-included) header back onto each bag so callers
  // can flatten bags with pack-view.js's flattenPack the same way every
  // other pack-listing endpoint does.
  const bags = header.bags.map(b => ({ ...b, printMaster: header }))
  const pendingPackIds = bags.filter(b => b.status === 'AWAITING_INWARD').map(b => b.packId)
  const scannedPackIds = bags.filter(b => b.status === 'SCANNED').map(b => b.packId)
  return { ...header, bags, pendingPackIds, scannedPackIds, expectedBags: header.numberOfBags }
}

export async function scanPack(itemCode, lotNo, packId, warehouse) {
  const header = await findHeader(itemCode, lotNo)

  // Single conditional row update — atomic, and unlike the old whole-session
  // optimistic-lock retry loop, concurrent scans of different packIds never
  // contend with each other at all.
  const result = await prisma.packDetail.updateMany({
    where: { packId, printMasterId: header.id, status: 'AWAITING_INWARD' },
    data: { status: 'SCANNED', warehouse, scannedAt: new Date() },
  })

  if (result.count === 0) {
    const pack = await prisma.packDetail.findUnique({ where: { packId } })
    if (!pack) throw new Error(`Pack ${packId} does not exist in system`)
    if (pack.printMasterId !== header.id) throw new Error(`Pack ${packId} belongs to a different item/lot`)
    throw new Error(`Pack ${packId} is already ${pack.status}`)
  }

  return getLotProgress(itemCode, lotNo)
}

// Accepts a batch of packIds scanned locally (already validated client-side)
// and applies them in one bulk conditional update — this is the sync
// endpoint the local-first scanning UI calls every ~800ms / 20 scans.
export async function batchScanPacks(itemCode, lotNo, packIds, warehouse) {
  const uniqueIds = [...new Set(packIds)]
  if (uniqueIds.length === 0) throw new Error('No packIds provided')

  const header = await findHeader(itemCode, lotNo)
  const packs = await prisma.packDetail.findMany({ where: { packId: { in: uniqueIds } } })
  const packById = new Map(packs.map(p => [p.packId, p]))

  const accepted = []
  const rejected = []
  for (const packId of uniqueIds) {
    const pack = packById.get(packId)
    if (!pack) { rejected.push({ packId, reason: 'NOT_FOUND' }); continue }
    if (pack.printMasterId !== header.id) { rejected.push({ packId, reason: 'WRONG_ITEM' }); continue }
    if (pack.status !== 'AWAITING_INWARD') { rejected.push({ packId, reason: 'ALREADY_' + pack.status }); continue }
    accepted.push(packId)
  }

  if (accepted.length > 0) {
    await prisma.packDetail.updateMany({
      where: { packId: { in: accepted }, status: 'AWAITING_INWARD' },
      data: { status: 'SCANNED', warehouse, scannedAt: new Date() },
    })
  }

  return { data: await getLotProgress(itemCode, lotNo), accepted, rejected }
}

export async function removeScan(itemCode, lotNo, packId) {
  const header = await findHeader(itemCode, lotNo)
  await prisma.packDetail.updateMany({
    where: { packId, printMasterId: header.id, status: 'SCANNED' },
    data: { status: 'AWAITING_INWARD', warehouse: null, scannedAt: null },
  })
  return getLotProgress(itemCode, lotNo)
}

export async function submitLotInward(itemCode, lotNo, warehouse) {
  const header = await findHeader(itemCode, lotNo)
  const scannedBags = await prisma.packDetail.findMany({ where: { printMasterId: header.id, status: 'SCANNED' } })
  if (scannedBags.length === 0) throw new Error('No packs scanned')

  await prisma.$transaction(async (tx) => {
    const now = new Date()
    await tx.packDetail.updateMany({
      where: { packId: { in: scannedBags.map(b => b.packId) } },
      data: { status: 'INWARDED', inwardedAt: now },
    })

    const prevBalance = await tx.stockLedger.findFirst({ where: { itemCode }, orderBy: { timestamp: 'desc' } })
    let runningBalance = prevBalance?.balance || 0

    const ledgerEntries = scannedBags.map(b => {
      runningBalance += b.totalQty
      const wh = b.warehouse || warehouse
      return {
        itemCode, sourceId: b.packId, transactionType: 'INWARD',
        inQty: b.totalQty, outQty: 0, balance: runningBalance,
        reference: `Lot ${lotNo} | Bag ${b.bagNo} | ${wh}`,
      }
    })
    await tx.stockLedger.createMany({ data: ledgerEntries })
  }, { timeout: 60000 })

  const nowReadyIndents = await checkAndUnblockIndents([itemCode])

  return {
    success: true,
    message: `${scannedBags.length} packs inwarded successfully`,
    nowReadyIndents,
  }
}

// Check PENDING_STOCK indents - if all RMs now have sufficient stock, move to OPEN
async function checkAndUnblockIndents(itemCodes) {
  // Find all PENDING_STOCK indents that require any of these item codes
  const pendingDetails = await prisma.indentDetails.findMany({
    where: { rmCode: { in: itemCodes }, indent: { status: 'PENDING_STOCK' } },
    include: { indent: { include: { details: true } } },
    distinct: ['indentId']
  })

  const readyIndentIds = []

  for (const detail of pendingDetails) {
    const indent = detail.indent
    // Re-check all RMs for this indent
    let allOk = true
    for (const d of indent.details) {
      // Only INWARDED bags count as available stock — PackDetail rows exist
      // from generation time onward, unlike the old PackBalance which only
      // ever held already-inwarded packs.
      const packStock = await prisma.packDetail.aggregate({
        where: { itemCode: d.rmCode, status: 'INWARDED', remainingQty: { gt: 0 } },
        _sum: { remainingQty: true }
      })
      const container = await prisma.containerMaster.findUnique({ where: { itemCode: d.rmCode } })
      const available = (packStock._sum.remainingQty || 0) + (container?.currentQty || 0)
      if (available < d.balanceQty) { allOk = false; break }
    }
    if (allOk) {
      await prisma.indentMaster.update({
        where: { indentId: indent.indentId },
        data: { status: 'OPEN' }
      })
      readyIndentIds.push(indent.indentId)
    }
  }

  return readyIndentIds
}
