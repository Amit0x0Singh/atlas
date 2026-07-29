import prisma from '../../../../../db.js'
import { generatePackBatch } from '../../../../../services/pack-generator.js'

// Plant returns have no real gate/vehicle entry, so we create an internal
// GateInward row to satisfy PrintMaster's mandatory gateInwardId — keeps
// every pack traceable through the same FK, with no special-casing needed
// anywhere downstream (GRN, stock, ledger, ...).
async function createReturnGateInward(plant, returnedBy) {
  return prisma.gateInward.create({
    data: {
      supplierName: plant ? `Plant Return — ${plant}` : 'Plant Return',
      invoiceNo:    returnedBy ? `RET-${returnedBy.replace(/\s+/g, '-').toUpperCase()}` : 'PLANT-RETURN',
      status:       'approved',
      createdBy:    returnedBy || null,
      entryTime:    new Date(),
    },
  })
}

const plantReturn = async (req, res) => {
  const { itemCode, itemName, uom, perPackQty, numberOfPacks, plant, returnedBy } = req.body

  try {

    if (!itemCode || !itemName || !uom || !perPackQty || !numberOfPacks)
      return res.status(400).json({ success: false, error: 'itemCode, itemName, uom, perPackQty and numberOfPacks are required' })

    if (parseInt(numberOfPacks) < 1 || parseFloat(perPackQty) <= 0)
      return res.status(400).json({ success: false, error: 'numberOfPacks must be ≥ 1 and perPackQty must be > 0' })

    const gateInward = await createReturnGateInward(plant, returnedBy)

    const result = await generatePackBatch({
      gateInwardId: gateInward.inwardId,
      itemCode,
      itemName,
      numberOfBags: parseInt(numberOfPacks),
      packQty:      parseFloat(perPackQty),
      uom,
    })

    return res.status(201).json({ success: true, data: result })

  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export { plantReturn }
