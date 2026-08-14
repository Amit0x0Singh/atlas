import prisma from '../../../../../config/db.js'

// Multiple companies operate out of this same facility — every gate
// movement must be tagged so stock can be segregated/reported per company.
const VALID_COMPANIES = ['SOM Phytopharma', 'Agrilife', 'DVS']

// -------------------   Gate Inward create

const createGateInward = async (req, res) => {
  try {
    const { supplier_name, invoice_no, vehicle_no, company } = req.body || {}

    if (!supplier_name?.trim())
      return res.status(400).json({ success: false, error: 'supplier_name is required', code: 'VALIDATION_ERROR' })

    if (!company?.trim() || !VALID_COMPANIES.includes(company.trim()))
      return res.status(400).json({ success: false, error: `company must be one of: ${VALID_COMPANIES.join(', ')}`, code: 'VALIDATION_ERROR' })

    const row = await prisma.gateInward.create({
      data: {
        supplierName: supplier_name.trim(),
        invoiceNo:    invoice_no?.trim()  || null,
        vehicleNo:    vehicle_no?.trim()  || null,
        companyName:  company.trim(),
        status:       'pending',
        createdBy:    req.user?.username  || null,
        // Doubles as "received date" for anything linked to this gate entry
        // (e.g. PrintMaster) — must be set at creation, not left null.
        entryTime:    new Date(),
      },
    })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    console.error('createGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

// -------------------   Gate Inward create (manual — Print Master flow)

// Store person creates a Print Master record without a Gate Inward already
// on file (goods received before Security logged them, or logged elsewhere).
// This backs that record with a real GateInward row so every PrintMaster row
// still has a gate_inward_id and both creation paths behave identically
// downstream — company is always this site's default, never asked for.
const MANUAL_ENTRY_COMPANY = 'SOM Phytopharma'

const createManualGateInward = async (req, res) => {
  try {
    const { supplier_name, invoice_no, received_date } = req.body || {}

    if (!supplier_name?.trim())
      return res.status(400).json({ success: false, error: 'supplier_name is required', code: 'VALIDATION_ERROR' })

    const receivedDate = received_date ? new Date(received_date) : null
    if (!receivedDate || Number.isNaN(receivedDate.getTime()))
      return res.status(400).json({ success: false, error: 'received_date is required and must be a valid date', code: 'VALIDATION_ERROR' })

    const row = await prisma.gateInward.create({
      data: {
        supplierName: supplier_name.trim(),
        invoiceNo:    invoice_no?.trim() || null,
        vehicleNo:    null,
        companyName:  MANUAL_ENTRY_COMPANY,
        status:       'pending',
        createdBy:    req.user?.username || null,
        entryTime:    receivedDate,
      },
    })
    return res.status(201).json({ success: true, data: row })
  } catch (err) {
    console.error('createManualGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

/// -------------------   Gate Outward Create

const createGateOutward = async (req, res) => {
  try {
    const { receiver_name, invoice_no, vehicle_no, company } = req.body || {}

    if (!company?.trim() || !VALID_COMPANIES.includes(company.trim()))
      return res.status(400).json({ success: false, error: `company must be one of: ${VALID_COMPANIES.join(', ')}`, code: 'VALIDATION_ERROR' })

    const row = await prisma.gateOutward.create({
      data: {
        receiverName: receiver_name?.trim() || null,
        invoiceNo:    invoice_no?.trim()    || null,
        vehicleNo:    vehicle_no?.trim()    || null,
        companyName:  company.trim(),
        status:       'pending',
        createdBy:    req.user?.username     || null,
      },
    })

    return res.status(201).json({ success: true, data: row })

  } catch (err) {
    console.error('createGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}

export { createGateInward, createGateOutward, createManualGateInward, VALID_COMPANIES }
