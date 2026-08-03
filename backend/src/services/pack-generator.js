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

// `batches` — one or more { numberOfBags, customerBatchCode?, expiryDate? }
// groups within the same lot. Bag numbering runs continuously across all
// groups (group 1 gets bags 1..N, group 2 continues at N+1, etc.) — the lot
// itself doesn't care about the split, only which physical bags carry which
// supplier batch code / expiry.
export async function generatePackBatch({ gateInwardId, itemCode, itemName, batches, packQty, uom }) {
  const year = new Date().getFullYear()
  const lotNo = await generateLotNo(itemCode, year)
  const lbl = extractLbl(itemName)
  const numberOfBags = batches.reduce((n, b) => n + b.numberOfBags, 0)

  const printMaster = await prisma.printMaster.create({
    data: { gateInwardId, itemCode, itemName, lotNo, packQty, uom, numberOfBags },
  })

  const bags = []
  let bagNo = 1
  for (const batch of batches) {
    for (let i = 0; i < batch.numberOfBags; i++) {
      bags.push({
        packId: buildPackId(lbl, itemCode, year, lotNo, bagNo),
        printMasterId: printMaster.id,
        itemCode,
        bagNo,
        totalQty: packQty,
        remainingQty: packQty,
        status: 'AWAITING_INWARD',
        customerBatchCode: batch.customerBatchCode || null,
        expiryDate: batch.expiryDate ? new Date(batch.expiryDate) : null,
      })
      bagNo++
    }
  }
  await prisma.packDetail.createMany({ data: bags, skipDuplicates: true })

  return { lotNo, printMasterId: printMaster.id, packs: bags }
}
