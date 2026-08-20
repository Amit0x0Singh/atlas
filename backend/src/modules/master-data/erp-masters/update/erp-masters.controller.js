import prisma from '../../../../db.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const updateSupplier = async (req, res) => {
  try {
    const { supplier_name, gstin, phone, email, address, is_active } = req.body || {}
    const data = {}
    if (supplier_name !== undefined) data.supplierName = supplier_name
    if (gstin !== undefined)         data.gstin        = gstin
    if (phone !== undefined)         data.phone        = phone
    if (email !== undefined)         data.email        = email
    if (address !== undefined)       data.address      = address
    if (is_active !== undefined)     data.isActive     = is_active

    const existing = await prisma.erpSupplier.findUnique({ where: { supplierId: req.params.id } })
    await prisma.erpSupplier.update({ where: { supplierId: req.params.id }, data })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'masters', tableName: 'erp_suppliers', recordId: req.params.id, oldValue: existing, newValue: req.body })
    return res.json({ success: true, message: 'Supplier updated' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Supplier not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}

// ── Equipment (ERP) ───────────────────────────────────────────────────────────

export const patchErpEquipment = async (req, res) => {
  try {
    const { status, equipment_name, working_volume, cleaning_time_hrs } = req.body || {}
    const data = {}
    if (status !== undefined)            data.status          = status
    if (equipment_name !== undefined)    data.equipmentName   = equipment_name
    if (working_volume !== undefined)    data.workingVolume   = working_volume
    if (cleaning_time_hrs !== undefined) data.cleaningTimeHrs = cleaning_time_hrs

    await prisma.erpEquipment.update({ where: { equipmentId: req.params.id }, data })
    await writeAudit({ ...auditUser(req), action: 'UPDATE', module: 'masters', tableName: 'erp_equipment', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Equipment updated' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ success: false, error: 'Equipment not found', code: 'NOT_FOUND' })
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
