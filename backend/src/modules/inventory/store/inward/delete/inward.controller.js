import { removeScan as removeScanFromLot } from '../../../../../services/inward-service.js'
import { writeAudit, auditUser } from '../../../../../middleware/audit.js'
import { toSafeErrorMessage } from '../../../../../utils/safe-error.js';

const removeScan = async (req, res) => {
  const { itemCode, lotNo, packId } = req.params
  try {

    const result = await removeScanFromLot(itemCode, lotNo, decodeURIComponent(packId))
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'inventory', tableName: 'pack_detail', recordId: decodeURIComponent(packId), notes: `removed scan from in-progress lot ${lotNo} (${itemCode})` })
    return res.json({ success: true, data: result })

  } catch (e) {
    return res.status(400).json({ success: false, error: toSafeErrorMessage(e), code: 'VALIDATION_ERROR' })
  }
}


export { removeScan }
