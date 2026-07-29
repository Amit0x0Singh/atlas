import { removeScan as removeScanFromLot } from '../../../../../services/inward-service.js'

const removeScan = async (req, res) => {
  const { itemCode, lotNo, packId } = req.params
  try {

    const result = await removeScanFromLot(itemCode, lotNo, decodeURIComponent(packId))
    return res.json({ success: true, data: result })

  } catch (e) {
    return res.status(400).json({ success: false, error: e.message, code: 'VALIDATION_ERROR' })
  }
}


export { removeScan }
