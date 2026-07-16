import prisma from '../db.js'

// Shared by scan/remove-scan so both can return a session shaped exactly
// like GET /inward/sessions/:id (i.e. including pendingPackIds) — the
// scanning UI used to always re-fetch the session after every scan just to
// pick up this one field, doubling the network round-trip on every single
// pack scanned.
async function withPendingPackIds(session) {
  // Only packs still awaiting inward — a pack already submitted through an
  // earlier session on this same item/lot (e.g. a partial submit that left
  // some bags for later) must not reappear as "pending" in a new session.
  // Only the fields actually used below — on a remote DB every extra column
  // is extra bytes over an already latency-bound round trip.
  const allPacks = await prisma.printMaster.findMany({
    where: { itemCode: session.itemCode, lotNo: session.lotNo, status: 'AWAITING_INWARD' },
    select: { packId: true },
    orderBy: { bagNo: 'asc' },
  })
  const pendingPackIds = allPacks.filter(p => !session.scannedPackIds.includes(p.packId)).map(p => p.packId)
  return { ...session, pendingPackIds }
}

// Superset of withPendingPackIds — also returns the full pack rows for the
// session's item/lot, which the frontend turns into a local packId -> pack
// lookup Map at session start so individual scans never need a DB round trip.
// packs deliberately includes every status (not just AWAITING_INWARD) so a
// stray re-scan of an already-inwarded QR from a prior session gets a
// proper "already INWARDED" rejection instead of "unknown pack" — but
// pendingPackIds must still exclude them, or they'd wrongly reappear as
// pending in a fresh session started after a partial submit.
async function withPackDetails(session) {
  const allPacks = await prisma.printMaster.findMany({
    where: { itemCode: session.itemCode, lotNo: session.lotNo },
    select: { packId: true, bagNo: true, packQty: true, uom: true, status: true },
    orderBy: { bagNo: 'asc' },
  })
  const scannedSet = new Set(session.scannedPackIds)
  const pendingPackIds = allPacks
    .filter(p => p.status === 'AWAITING_INWARD' && !scannedSet.has(p.packId))
    .map(p => p.packId)
  return { ...session, packs: allPacks, pendingPackIds }
}

export async function createInwardSession({ itemCode, lotNo, warehouse }) {
  const existing = await prisma.inwardSession.findFirst({
    where: { itemCode, lotNo, status: 'ACTIVE' }
  })
  // Returning full pack details here (not just the bare session row) lets
  // the scanning UI build its local lookup Map from this one response —
  // it used to always follow up with a separate GET /sessions/:id call
  // just to fetch this same data a second time.
  if (existing) return { success: true, data: await withPackDetails(existing), resumed: true }

  // Only the row count is needed here — count() avoids transferring every
  // pack's full row data over the wire just to read .length off the array.
  const packCount = await prisma.printMaster.count({
    where: { itemCode, lotNo, status: 'AWAITING_INWARD' }
  })
  if (!packCount) throw new Error('No packs awaiting inward for this item/lot')

  const session = await prisma.inwardSession.create({
    data: { itemCode, lotNo, warehouse, expectedBags: packCount, scannedPackIds: [] }
  })
  return { success: true, data: await withPackDetails(session), resumed: false }
}

export async function scanPackForSession(sessionId, packId, warehouse) {
  // Session and pack are independent lookups — firing them together instead
  // of one-after-another halves their combined round-trip cost, which is
  // most of what a single scan waits on against a remote DB.
  const [session, pack] = await Promise.all([
    prisma.inwardSession.findUnique({ where: { sessionId } }),
    prisma.printMaster.findUnique({ where: { packId } }),
  ])
  if (!session) throw new Error('Session not found')
  if (session.status !== 'ACTIVE') throw new Error('Session is not active')
  if (!pack) throw new Error(`Pack ${packId} does not exist in system`)
  if (pack.itemCode !== session.itemCode) throw new Error(`Pack belongs to ${pack.itemCode}, expected ${session.itemCode}`)
  if (pack.status !== 'AWAITING_INWARD') throw new Error(`Pack ${packId} is already ${pack.status}`)
  if (session.scannedPackIds.includes(packId)) throw new Error('Pack already scanned in this session')

  const resolvedWarehouse = warehouse || session.warehouse
  // session.packWarehouses is already in hand from the fetch above — the
  // previous version re-fetched the same session a second time just for
  // this field, a fully redundant round trip on every scan.
  const merged = { ...(session.packWarehouses || {}), [packId]: resolvedWarehouse }

  const updated = await prisma.inwardSession.update({
    where: { sessionId },
    data: { scannedPackIds: { push: packId }, packWarehouses: merged },
  })
  return { success: true, data: await withPendingPackIds(updated) }
}

// Accepts a batch of packIds scanned locally (already validated client-side
// against the session's start-of-scan snapshot) and merges the still-valid
// ones into the session in a single write — this is the sync endpoint the
// local-first scanning UI calls every ~800ms of activity / 20 scans, instead
// of one DB round trip per individual scan.
export async function batchScanPacksForSession(sessionId, packIds, warehouse) {
  const uniqueIds = [...new Set(packIds)]
  if (uniqueIds.length === 0) throw new Error('No packIds provided')

  let session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.status !== 'ACTIVE') throw new Error('Session is not active')

  const packs = await prisma.printMaster.findMany({ where: { packId: { in: uniqueIds } } })
  const packById = new Map(packs.map(p => [p.packId, p]))

  const accepted = []
  const rejected = []
  const alreadyScanned = new Set(session.scannedPackIds)

  for (const packId of uniqueIds) {
    if (alreadyScanned.has(packId)) { rejected.push({ packId, reason: 'ALREADY_SCANNED' }); continue }
    const pack = packById.get(packId)
    if (!pack) { rejected.push({ packId, reason: 'NOT_FOUND' }); continue }
    if (pack.itemCode !== session.itemCode) { rejected.push({ packId, reason: 'WRONG_ITEM' }); continue }
    if (pack.status !== 'AWAITING_INWARD') { rejected.push({ packId, reason: 'ALREADY_' + pack.status }); continue }
    accepted.push(packId)
  }

  if (accepted.length === 0) {
    return { success: true, data: await withPackDetails(session), accepted, rejected }
  }

  const resolvedWarehouse = warehouse || session.warehouse

  // Optimistic concurrency on `updatedAt`: if another device flushed a batch
  // in between our read and write, the conditional update matches 0 rows —
  // re-fetch, re-merge (still skipping anything that device already
  // accepted), and retry. Contention on a single session is rare and brief,
  // so a small retry loop is simpler and cheaper than a lock table or Redis.
  for (let attempt = 0; attempt < 3; attempt++) {
    const mergedIds = [...new Set([...session.scannedPackIds, ...accepted])]
    const mergedWarehouses = { ...(session.packWarehouses || {}) }
    for (const packId of accepted) mergedWarehouses[packId] = resolvedWarehouse

    const result = await prisma.inwardSession.updateMany({
      where: { sessionId, updatedAt: session.updatedAt },
      data: { scannedPackIds: mergedIds, packWarehouses: mergedWarehouses },
    })

    if (result.count > 0) {
      const updated = await prisma.inwardSession.findUnique({ where: { sessionId } })
      return { success: true, data: await withPackDetails(updated), accepted, rejected }
    }

    // Lost the race — re-fetch and drop anything the other writer already scanned.
    session = await prisma.inwardSession.findUnique({ where: { sessionId } })
    if (!session) throw new Error('Session not found')
    const stillAlreadyScanned = new Set(session.scannedPackIds)
    for (const packId of [...accepted]) {
      if (stillAlreadyScanned.has(packId)) {
        accepted.splice(accepted.indexOf(packId), 1)
        rejected.push({ packId, reason: 'ALREADY_SCANNED' })
      }
    }
    if (accepted.length === 0) return { success: true, data: await withPackDetails(session), accepted, rejected }
  }

  throw new Error('Could not sync scans — session is being updated concurrently, please retry')
}

export async function removeScanFromSession(sessionId, packId) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw new Error('Session not found')
  const updated = await prisma.inwardSession.update({
    where: { sessionId },
    data: { scannedPackIds: session.scannedPackIds.filter(id => id !== packId) }
  })
  return { success: true, data: await withPendingPackIds(updated) }
}

export async function submitInwardSession(sessionId, transactedBy) {
  const session = await prisma.inwardSession.findUnique({ where: { sessionId } })
  if (!session) throw new Error('Session not found')
  if (session.scannedPackIds.length === 0) throw new Error('No packs scanned')

  const packs = await prisma.printMaster.findMany({
    where: { packId: { in: session.scannedPackIds } }
  })

  const inwaredItemCodes = [...new Set(packs.map(p => p.itemCode))]

  const packWarehouses = (session.packWarehouses && typeof session.packWarehouses === 'object')
    ? session.packWarehouses
    : {}

  await prisma.$transaction(async (tx) => {
    await tx.inward.createMany({
      data: packs.map(p => ({
        packId: p.packId, itemCode: p.itemCode, itemName: p.itemName,
        lotNo: p.lotNo, bagNo: p.bagNo, qty: p.packQty,
        warehouse: packWarehouses[p.packId] || session.warehouse,
      }))
    })
    await tx.packBalance.createMany({
      data: packs.map(p => ({
        packId: p.packId, itemCode: p.itemCode,
        totalQty: p.packQty, remainingQty: p.packQty,
      })),
      skipDuplicates: true,
    })

    let runningBalance = 0
    const prevBalance = await tx.stockLedger.findFirst({
      where: { itemCode: session.itemCode }, orderBy: { timestamp: 'desc' }
    })
    runningBalance = prevBalance?.balance || 0

    const ledgerEntries = packs.map(p => {
      runningBalance += p.packQty
      const wh = packWarehouses[p.packId] || session.warehouse
      return {
        itemCode: p.itemCode, sourceId: p.packId, transactionType: 'INWARD',
        inQty: p.packQty, outQty: 0, balance: runningBalance,
        reference: `Lot ${p.lotNo} | Bag ${p.bagNo} | ${wh}`,
      }
    })
    await tx.stockLedger.createMany({ data: ledgerEntries })
    await tx.inwardSession.update({ where: { sessionId }, data: { status: 'SUBMITTED' } })
    await tx.printMaster.updateMany({
      where: { packId: { in: session.scannedPackIds } },
      data:  { status: 'INWARDED' },
    })
  }, { timeout: 60000 })

  // After successful inward - re-check any PENDING_STOCK indents for these items
  const nowReadyIndents = await checkAndUnblockIndents(inwaredItemCodes)

  return {
    success: true,
    message: `${packs.length} packs inwarded successfully`,
    nowReadyIndents
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
      const packStock = await prisma.packBalance.aggregate({
        where: { itemCode: d.rmCode, remainingQty: { gt: 0 } },
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
