import { scanPack as scanPackForLot, batchScanPacks as batchScanPacksForLot, submitLotInward } from '../../../../../services/inward-service.js'

const scanPack = async (req, res) => {
  const { itemCode, lotNo } = req.params
  const { packId, warehouse } = req.body

  try {
    const result = await scanPackForLot(itemCode, lotNo, packId, warehouse)
    return res.json({ success: true, data: result })

  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const batchScanPack = async (req, res) => {
  const { itemCode, lotNo } = req.params
  const { packIds, warehouse } = req.body

  try {
    if (!Array.isArray(packIds) || packIds.length === 0)
      return res.status(400).json({ success: false, error: 'packIds must be a non-empty array', code: 'VALIDATION_ERROR' })

    const result = await batchScanPacksForLot(itemCode, lotNo, packIds, warehouse)
    return res.json({ success: true, ...result })

  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}

const submitLot = async (req, res) => {
  const { itemCode, lotNo } = req.params
  const { warehouse } = req.body
  try {
    const result = await submitLotInward(itemCode, lotNo, warehouse)
    return res.json(result)

  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}



export {
  scanPack,
  batchScanPack,
  submitLot
}
