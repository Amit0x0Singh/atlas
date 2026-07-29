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

export async function generatePackBatch({ gateInwardId, itemCode, itemName, numberOfBags, packQty, uom, customerBatchCode, expiryDate }) {
  const year = new Date().getFullYear()
  const lotNo = await generateLotNo(itemCode, year)
  const lbl = extractLbl(itemName)

  const printMaster = await prisma.printMaster.create({
    data: {
      gateInwardId, itemCode, itemName, lotNo, packQty, uom,
      numberOfBags,
      customerBatchCode: customerBatchCode || null,
      expiryDate: expiryDate ? new Date(expiryDate) : null,
    },
  })

  const bags = []
  for (let i = 1; i <= numberOfBags; i++) {
    bags.push({
      packId: buildPackId(lbl, itemCode, year, lotNo, i),
      printMasterId: printMaster.id,
      itemCode,
      bagNo: i,
      totalQty: packQty,
      remainingQty: packQty,
      status: 'AWAITING_INWARD',
    })
  }
  await prisma.packDetail.createMany({ data: bags, skipDuplicates: true })

  return { lotNo, printMasterId: printMaster.id, packs: bags }
}
