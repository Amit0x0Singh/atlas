import prisma from '../../../../db.js'

/// -------------------   Gate Inward list and get

const listGateInward = async (req, res) => {
  try {
    const { search, status, company, from_date, to_date, invoice_no, limit = '50', offset = '0' } = req.query
    const lim = Math.min(Number(limit) || 50, 200)
    const off = Number(offset) || 0

    const where = {}
    // Single quick-search box matches either field — a dedicated invoice_no
    // filter still exists below for callers that want to search that one
    // field precisely instead.
    if (search?.trim()) {
      const q = search.trim()
      where.OR = [
        { supplierName: { contains: q, mode: 'insensitive' } },
        { invoiceNo:    { contains: q, mode: 'insensitive' } },
      ]
    }
    if (invoice_no?.trim()) where.invoiceNo    = { contains: invoice_no.trim(), mode: 'insensitive' }
    if (status?.trim())     where.status       = status.trim()
    if (company?.trim())    where.companyName  = company.trim()
    if (from_date?.trim() || to_date?.trim()) {
      where.createdAt = {}
      if (from_date?.trim()) where.createdAt.gte = new Date(from_date)
      if (to_date?.trim())   where.createdAt.lte = new Date(to_date + 'T23:59:59.999Z')
    }

    const [rows, total] = await Promise.all([
      prisma.gateInward.findMany({
        where,
        select: { inwardId: true, supplierName: true, invoiceNo: true, vehicleNo: true, companyName: true, status: true, requestDelete: true, createdAt: true, updatedAt: true },
        orderBy: { createdAt: 'desc' },
        skip: off,
        take: lim,
      }),
      prisma.gateInward.count({ where }),
    ])

    return res.json({ success: true, data: rows, total })
  } catch (err) {
    console.error('listGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


// -------------------   Gate Inward get

const getGateInward = async (req, res) => {

  const { id } = req.params
  try {

    const row = await prisma.gateInward.findUnique({ where: { inwardId: id } })
    if (!row) return res.status(404).json({ success: false, error: 'Gate inward not found', code: 'NOT_FOUND' })
    return res.json({ success: true, data: row })
    
  } catch (err) {
    console.error('getGateInward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


// -------------------   Gate Outward list and get

const listGateOutward = async (req, res) => {
  try {

    const { search, status, company, from_date, to_date, invoice_no, limit = '50', offset = '0' } = req.query
    const lim = Math.min(Number(limit) || 50, 200)
    const off = Number(offset) || 0

    const where = {}
    if (search?.trim())     where.receiverName = { contains: search.trim(), mode: 'insensitive' }
    if (invoice_no?.trim()) where.invoiceNo    = { contains: invoice_no.trim(), mode: 'insensitive' }
    if (status?.trim())     where.status       = status.trim()
    if (company?.trim())    where.companyName  = company.trim()
    if (from_date?.trim() || to_date?.trim()) {
      where.createdAt = {}
      if (from_date?.trim()) where.createdAt.gte = new Date(from_date)
      if (to_date?.trim())   where.createdAt.lte = new Date(to_date + 'T23:59:59.999Z')
    }

    const [rows, total] = await Promise.all([
      prisma.gateOutward.findMany({
        where,
        select: { outwardId: true, receiverName: true, invoiceNo: true, vehicleNo: true, companyName: true, status: true, requestDelete: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        skip: off,
        take: lim,
      }),
      prisma.gateOutward.count({ where }),
    ])

    return res.json({ success: true, data: rows, total })

  } catch (err) {
    console.error('listGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


/// -------------------   Gate Outward get

const getGateOutward = async (req, res) => {
  const { id } = req.params
  try { 

    const row = await prisma.gateOutward.findUnique({ where: { outwardId: id } })
    if (!row)
      return res.status(404).json({ success: false, error: 'Gate outward not found', code: 'NOT_FOUND' })
    
    return res.json({ success: true, data: row })
    
  } catch (err) {
    console.error('getGateOutward error:', err.message)
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}


export {
  listGateInward,
  getGateInward,
  listGateOutward,
  getGateOutward
}