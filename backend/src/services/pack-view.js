// Shared projection: flattens a PackDetail row (+ its PrintMaster header +
// GateInward) back into the old flat per-bag shape most read endpoints and
// frontend pages already expect (supplier/invoiceNo/receivedDate included).
// Keeps the DB properly normalized while the API surface stays stable —
// only endpoints that actually create/mutate packs need to know about the
// new gateInwardId-based contract.
export const packDetailInclude = { printMaster: { include: { gateInward: true } } }

// PackDetail.status only ever tracks the inward lifecycle
// (AWAITING_INWARD -> SCANNED -> INWARDED) — it's never written back to
// EXHAUSTED/PARTIALLY_ISSUED once inwarded, those are derived here from
// remainingQty/totalQty instead of being stored (and risking going stale).
function displayStatus(bag) {
  if (bag.status !== 'INWARDED') return bag.status
  if (bag.remainingQty <= 0) return 'EXHAUSTED'
  if (bag.remainingQty < bag.totalQty) return 'PARTIALLY_ISSUED'
  return 'INWARDED'
}

export function flattenPack(bag) {
  const pm = bag.printMaster
  const gi = pm?.gateInward
  return {
    packId: bag.packId,
    printMasterId: bag.printMasterId,
    gateInwardId: pm?.gateInwardId ?? null,
    itemCode: bag.itemCode,
    itemName: pm?.itemName,
    lotNo: pm?.lotNo,
    bagNo: bag.bagNo,
    packQty: bag.totalQty,
    totalQty: bag.totalQty,
    remainingQty: bag.remainingQty,
    uom: pm?.uom,
    supplier: gi?.supplierName ?? null,
    invoiceNo: gi?.invoiceNo ?? null,
    receivedDate: gi?.entryTime ?? null,
    companyName: gi?.companyName ?? null,
    vehicleNo: gi?.vehicleNo ?? null,
    // Per-bag, not per-lot — different bag ranges within the same lot can
    // carry different supplier batch codes / expiry dates.
    customerBatchCode: bag.customerBatchCode ?? null,
    expiryDate: bag.expiryDate ?? null,
    status: displayStatus(bag),
    warehouse: bag.warehouse ?? null,
    scannedAt: bag.scannedAt ?? null,
    inwardedAt: bag.inwardedAt ?? null,
    createdAt: pm?.createdAt,
    createdBy: pm?.createdBy ?? null,
    updatedBy: pm?.updatedBy ?? null,
    updatedAt: pm?.updatedAt ?? null,
  }
}
