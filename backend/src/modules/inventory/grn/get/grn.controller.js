import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js';

// A bag only counts toward a GRN once the Store Person has actually scanned
// it during Raw Material Inward — Print Master merely prints a QR label and
// leaves the bag AWAITING_INWARD, which must NOT be mistaken for "received".
// SCANNED (mid Pack-Inward session) and INWARDED (submitted) both count, so
// the GRN's received quantity climbs live as scanning happens, not only
// after the store person clicks Submit.
const isReceived = (bag) => bag.status !== 'AWAITING_INWARD'

// List all GRNs — one row per Gate Inward entry that has at least one
// scanned bag. Grouped by the gateInwardId FK, instead of matching on
// invoiceNo + supplier strings. A Gate Inward with packs printed but none
// scanned yet does not appear here — printing labels is not receiving.
const listGrn = async (req, res) => {

  try {
    const headers = await prisma.printMaster.findMany({
      include: { gateInward: true, bags: { select: { packId: true, status: true, totalQty: true } } },
      orderBy: { createdAt: 'desc' },
    })

    const groups = new Map()

    for (const h of headers) {
      const gi = h.gateInward
      const receivedBags = h.bags.filter(isReceived)
      // A header (item) with nothing scanned yet still contributes its name
      // to the invoice's item list — the GRN must list every material on
      // the invoice — but contributes zero bags/qty until something is
      // actually scanned.
      if (!groups.has(gi.inwardId)) {
        groups.set(gi.inwardId, {
          gateInwardId: gi.inwardId,
          invoiceNo: gi.invoiceNo || '—',
          supplier: gi.supplierName,
          company: gi.companyName,
          receivedDate: gi.entryTime,
          totalPacks: 0,
          totalQty: 0,
          items: new Set(),
          hasReceivedBags: false,
          createdAt: h.createdAt,
        })
      }

      const g = groups.get(gi.inwardId)
      g.totalPacks += receivedBags.length
      // Each bag carries its own qty — batch groups within the same item/lot
      // can differ in pack size — so the total must sum actual bag
      // quantities rather than assume every bag matches the header's
      // (first-batch-only, reference) packQty.
      g.totalQty += receivedBags.reduce((s, b) => s + Number(b.totalQty), 0)
      g.items.add(h.itemName)
      if (receivedBags.length > 0) g.hasReceivedBags = true
      if (h.createdAt > g.createdAt) g.createdAt = h.createdAt
    }

    const result = [...groups.values()]
      // The GRN itself only "exists" once Raw Material Inward scanning has
      // started for this invoice — not the moment Print Master prints labels.
      .filter(g => g.hasReceivedBags)
      .map(({ hasReceivedBags, ...g }) => ({ ...g, items: [...g.items], uniqueItems: g.items.size }))

    result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    return res.json({ success: true, data: result })

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}


/// Get GRN detail for a specific Gate Inward entry
const getGrnDetail = async (req, res) => {
  const { gateInwardId } = req.query

  try {
    if (!gateInwardId)
      return res.status(400).json({ success: false, error: 'gateInwardId required', code: 'VALIDATION_ERROR' })

    const gateInward = await prisma.gateInward.findUnique({ where: { inwardId: gateInwardId } })
    if (!gateInward)
      return res.status(404).json({ success: false, error: 'Gate Inward entry not found', code: 'NOT_FOUND' })

    const headers = await prisma.printMaster.findMany({
      where: { gateInwardId },
      include: { bags: true },
      orderBy: { itemCode: 'asc' },
    })

    if (headers.length === 0)
      return res.status(404).json({ success: false, error: 'No packs found for this Gate Inward entry', code: 'NOT_FOUND' })

    // Every material on the invoice is listed — even ones with zero bags
    // scanned so far — but bag counts/qty only reflect what's actually been
    // scanned during Raw Material Inward, so the GRN always shows the true
    // cumulative received quantity rather than what was merely printed.
    // `packQty` (the "Qty / Bag" column) is reported as the average per
    // received bag rather than the header's reference value, since batch
    // groups within the same item/lot can now carry different bag sizes —
    // averaging keeps "Qty / Bag" × "No. of Bags" == "Total Qty" always
    // true on the printed document, even when individual bags differ.
    const items = headers.map(h => {
      const receivedBags = h.bags.filter(isReceived)
      const totalQty = receivedBags.reduce((s, b) => s + Number(b.totalQty), 0)
      return {
        itemCode: h.itemCode, itemName: h.itemName, uom: h.uom,
        totalBags: receivedBags.length,
        packQty: receivedBags.length > 0 ? totalQty / receivedBags.length : 0,
        totalQty,
        lotNo: h.lotNo, receivedDate: gateInward.entryTime,
      }
    })

    if (!items.some(i => i.totalBags > 0))
      return res.status(404).json({ success: false, error: 'No bags scanned yet for this Gate Inward entry', code: 'NOT_FOUND' })

    const allPacks = headers.flatMap(h => h.bags.filter(isReceived).map(b => ({
      packId: b.packId, itemCode: h.itemCode, itemName: h.itemName, lotNo: h.lotNo,
      bagNo: b.bagNo, packQty: b.totalQty, uom: h.uom, status: b.status,
    })))

    return res.json({
      success: true,
      data: {
        gateInwardId, invoiceNo: gateInward.invoiceNo || '—', supplier: gateInward.supplierName,
        company: gateInward.companyName || null, receivedDate: gateInward.entryTime,
        items, allPacks,
        totalPacks: allPacks.length, totalQty: items.reduce((s, i) => s + i.totalQty, 0),
      }
    })

  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}


export { listGrn, getGrnDetail }
