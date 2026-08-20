import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js';

const VALID_STATUSES = ['pending', 'approved', 'rejected']

const requestDeleteGateInward = async (req, res) => {
  const {id} = req.params
  try {
    const row = await prisma.gateInward.update({
      where: { inwardId: id },
      data: { requestDelete: true },
    })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_inward', recordId: id, newValue: { requestDelete: true }, notes: 'delete requested' })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('requestDeleteGateInward error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

const requestDeleteGateOutward = async (req, res) => {
  const {id} = req.params
  try {

    const row = await prisma.gateOutward.update({
      where: { outwardId: id },
      data: { requestDelete: true },
    })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_outward', recordId: id, newValue: { requestDelete: true }, notes: 'delete requested' })
    return res.json({ success: true, data: row })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('requestDeleteGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

const updateGateInward = async (req, res) => {
  const { id } = req.params
  const { supplier_name, invoice_no, vehicle_no, company } = req.body || {}
  try {
    const before = await prisma.gateInward.findUnique({ where: { inwardId: id } })
    if (!before) return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })

    const row = await prisma.gateInward.update({
      where: { inwardId: id },
      data: {
        supplierName: supplier_name.trim(),
        invoiceNo:    invoice_no.trim(),
        vehicleNo:    vehicle_no.trim(),
        companyName:  company.trim(),
      },
    })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_inward', recordId: id, oldValue: before, newValue: row })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('updateGateInward error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

const updateGateOutward = async (req, res) => {
  const { id } = req.params
  const { receiver_name, invoice_no, vehicle_no, company } = req.body || {}
  try {
    const before = await prisma.gateOutward.findUnique({ where: { outwardId: id } })
    if (!before) return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })

    const row = await prisma.gateOutward.update({
      where: { outwardId: id },
      data: {
        receiverName: receiver_name?.trim() || null,
        invoiceNo:    invoice_no.trim(),
        vehicleNo:    vehicle_no.trim(),
        companyName:  company.trim(),
      },
    })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_outward', recordId: id, oldValue: before, newValue: row })
    return res.json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('updateGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

const updateGateInwardStatus = async (req, res) => {
  const { status } = req.body || {}
  try {

    if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      })

    const row = await prisma.gateInward.update({
      where: { inwardId: req.params.id },
      data: { status },
    })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_inward', recordId: req.params.id, newValue: { status } })
    return res.json({ success: true, data: row })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    console.error('updateGateInwardStatus error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

const updateGateOutwardStatus = async (req, res) => {
  const { status } = req.body || {}
  const { id } = req.params
  try {

     if (!status || !VALID_STATUSES.includes(status))
      return res.status(400).json({
        success: false,
        error: `status must be one of: ${VALID_STATUSES.join(', ')}`,
        code: 'VALIDATION_ERROR',
      })

    const row = await prisma.gateOutward.update({
      where: { outwardId: id },
      data: { status },
    })

    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'gate', tableName: 'gate_outward', recordId: id, newValue: { status } })
    return res.json({ success: true, data: row })

  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    console.error('updateGateOutwardStatus error:', err.message)
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}



export {
  requestDeleteGateInward,
  requestDeleteGateOutward,
  updateGateInward,
  updateGateOutward,
  updateGateInwardStatus,
  updateGateOutwardStatus,
}