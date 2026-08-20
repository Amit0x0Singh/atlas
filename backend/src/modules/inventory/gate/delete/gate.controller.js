import fs from 'fs'
import path from 'path'
import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { GATE_INWARD_INVOICES_DIR, GATE_OUTWARD_INVOICES_DIR } from '../utils/storage-paths.js'



// Gate Inward delete controller
const deleteGateInward = async (req, res) => {
  const { id } = req.params

  try {

    const deleted = await prisma.gateInward.delete({ where: { inwardId: id } })
    if (deleted.invoiceDocFileName) fs.unlink(path.join(GATE_INWARD_INVOICES_DIR, deleted.invoiceDocFileName), () => {})
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'gate', tableName: 'gate_inward', recordId: id, oldValue: deleted })
    return res.json({ success: true, message: 'Gate inward deleted' })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('deleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }

}

// ----------------   Gate Outward deletion

const deleteGateOutward = async (req, res) => {
  const { id } = req.params

  try {
    const deleted = await prisma.gateOutward.delete({ where: { outwardId: id } })
    if (deleted.invoiceDocFileName) fs.unlink(path.join(GATE_OUTWARD_INVOICES_DIR, deleted.invoiceDocFileName), () => {})
    await writeAudit({ ...auditUser(req), action: 'DELETE', module: 'gate', tableName: 'gate_outward', recordId: id, oldValue: deleted })
    return res.json({ success: true, message: 'Gate outward deleted' })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('deleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


export { deleteGateInward, deleteGateOutward }
