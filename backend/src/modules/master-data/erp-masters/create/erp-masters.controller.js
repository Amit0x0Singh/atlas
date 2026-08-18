import prisma from '../../../../db.js'
import { writeAudit, auditUser } from '../../../../middleware/audit.js'
import { normalizeUom, toCanonical } from '../../../../utils/uom.js'

// ── Suppliers ─────────────────────────────────────────────────────────────────

export const createSupplier = async (req, res) => {
  try {
    const { supplier_name, gstin, phone, email, address } = req.body || {}
    if (!supplier_name) return res.status(400).json({ success: false, error: 'supplier_name required', code: 'VALIDATION_ERROR' })

    const row = await prisma.erpSupplier.create({
      data: {
        supplierName: supplier_name,
        gstin: gstin || null,
        phone: phone || null,
        email: email || null,
        address: address || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', module: 'masters', tableName: 'erp_suppliers', recordId: row.supplierId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Plants ────────────────────────────────────────────────────────────────────

export const createPlant = async (req, res) => {
  try {
    const { plant_name, plant_code, location, plant_type } = req.body || {}
    if (!plant_name || !plant_code || !plant_type)
      return res.status(400).json({ success: false, error: 'plant_name, plant_code, plant_type required', code: 'VALIDATION_ERROR' })

    const row = await prisma.erpPlant.create({
      data: {
        plantName: plant_name,
        plantCode: plant_code,
        location: location || null,
        plantType: plant_type,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', module: 'masters', tableName: 'erp_plants', recordId: row.plantId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Plant code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Equipment (ERP) ───────────────────────────────────────────────────────────

export const createErpEquipment = async (req, res) => {
  try {
    const { plant_id, equipment_name, equipment_code, equipment_type,
            working_volume, working_volume_unit, cleaning_time_hrs, requires_sterilisation } = req.body || {}
    if (!equipment_name || !equipment_code || !equipment_type)
      return res.status(400).json({ success: false, error: 'equipment_name, equipment_code, equipment_type required', code: 'VALIDATION_ERROR' })

    let canonicalWorkingVolume = working_volume || null
    let canonicalWorkingVolumeUnit = working_volume_unit || 'KG'
    if (working_volume) {
      try {
        const c = toCanonical(working_volume, canonicalWorkingVolumeUnit)
        canonicalWorkingVolume = c.qty
        canonicalWorkingVolumeUnit = c.uom
      } catch (e) {
        return res.status(400).json({ success: false, error: `working_volume_unit: ${e.message}`, code: 'VALIDATION_ERROR' })
      }
    } else {
      canonicalWorkingVolumeUnit = normalizeUom(canonicalWorkingVolumeUnit) || 'KG'
    }

    const row = await prisma.erpEquipment.create({
      data: {
        plantId: plant_id || null,
        equipmentName: equipment_name,
        equipmentCode: equipment_code,
        equipmentType: equipment_type,
        workingVolume: canonicalWorkingVolume,
        workingVolumeUnit: canonicalWorkingVolumeUnit,
        cleaningTimeHrs: cleaning_time_hrs || 0,
        requiresSterilisation: requires_sterilisation || false,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', module: 'masters', tableName: 'erp_equipment', recordId: row.equipmentId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Equipment code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Strains ───────────────────────────────────────────────────────────────────

export const createStrain = async (req, res) => {
  try {
    const { strain_name, decay_k, optimal_temp_c, min_viable_cfu_per_ml, notes } = req.body || {}
    if (!strain_name || decay_k === undefined)
      return res.status(400).json({ success: false, error: 'strain_name and decay_k required', code: 'VALIDATION_ERROR' })

    const row = await prisma.microbialStrain.create({
      data: {
        strainName: strain_name,
        decayK: decay_k,
        optimalTempC: optimal_temp_c || null,
        minViableCfuPerMl: min_viable_cfu_per_ml || null,
        notes: notes || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', module: 'masters', tableName: 'microbial_strains', recordId: row.strainId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// ── Customers ─────────────────────────────────────────────────────────────────

export const createCustomer = async (req, res) => {
  try {
    const { customer_name, customer_code, gstin, address, state, phone, email } = req.body || {}
    if (!customer_name) return res.status(400).json({ success: false, error: 'customer_name required', code: 'VALIDATION_ERROR' })

    const row = await prisma.customer.create({
      data: {
        customerName: customer_name,
        customerCode: customer_code || null,
        gstin: gstin || null,
        address: address || null,
        state: state || null,
        phone: phone || null,
        email: email || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', module: 'masters', tableName: 'customers', recordId: row.customerId, newValue: req.body })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Customer code already exists', code: 'CONFLICT' })
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
