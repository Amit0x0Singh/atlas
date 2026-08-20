import prisma from '../db.js'
import { generateLotNo } from './lot-generator.js'

export function extractLbl(itemName) {
  const alphanum = itemName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return alphanum.slice(0, 3).padEnd(3, 'X')
}

export function buildPackId(lbl, itemCode, year, lotNo, bagNo) {
  const lotSeq = lotNo.split('-').pop()
  const bagStr = String(bagNo).padStart(3, '0')
  return `${lbl}-${itemCode}-${year}-${lotSeq}-${bagStr}`
}

// `batches` — one or more { numberOfBags, packQty, customerBatchCode?,
// expiryDate? } groups within the same lot. Bag numbering runs continuously
// across all groups (group 1 gets bags 1..N, group 2 continues at N+1,
// etc.) — the lot itself doesn't care about the split, only which physical
// bags carry which supplier batch code / expiry / qty. Each batch group
// carries its own `packQty` because a single invoice line/lot can arrive
// packed at different bag sizes across its supplier batches (e.g. bags 1-10
// at 25kg/bag, bags 11-18 at 20kg/bag) — `PackDetail.totalQty` is always the
// source of truth per bag; `PrintMaster.packQty` below is only ever a
// reference value (the first batch group's qty), never used for real
// quantity math (see grn.controller.js, which sums bag-level totalQty).
export async function generatePackBatch({ gateInwardId, itemCode, itemName, batches, uom }) {
  const year = new Date().getFullYear()
  const lotNo = await generateLotNo(itemCode, year)
  const lbl = extractLbl(itemName)
  const numberOfBags = batches.reduce((n, b) => n + b.numberOfBags, 0)

  const bags = []
  let bagNo = 1
  for (const batch of batches) {
    for (let i = 0; i < batch.numberOfBags; i++) {
      bags.push({
        packId: buildPackId(lbl, itemCode, year, lotNo, bagNo),
        itemCode,
        bagNo,
        totalQty: batch.packQty,
        remainingQty: batch.packQty,
        status: 'AWAITING_INWARD',
        customerBatchCode: batch.customerBatchCode || null,
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
      })
      bagNo++
    }
  }

  // PrintMaster header and its PackDetail rows must land together — a crash
  // between the two calls would otherwise leave a header with zero bags.
  const printMaster = await prisma.$transaction(async (tx) => {
    const pm = await tx.printMaster.create({
      data: { gateInwardId, itemCode, itemName, lotNo, packQty: batches[0].packQty, uom, numberOfBags },
    })
    await tx.packDetail.createMany({
      data: bags.map((b) => ({ ...b, printMasterId: pm.id })),
      skipDuplicates: true,
    })
    return pm
  })

  return { lotNo, printMasterId: printMaster.id, packs: bags.map((b) => ({ ...b, printMasterId: printMaster.id })) }
}
