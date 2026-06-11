import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { createNotification } from '../../../services/notification-service.js'
import QRCode from 'qrcode'

async function generateLotNumbers(itemCode, itemName, year, count) {
  const row = await prisma.$transaction(async tx => {
    await tx.gateLotSequence.upsert({
      where: { itemCode_year: { itemCode, year } },
      create: { itemCode, year, seq: count },
      update: { seq: { increment: count } },
    })
    return tx.gateLotSequence.findUnique({ where: { itemCode_year: { itemCode, year } } })
  })
  const endSeq = row.seq
  const startSeq = endSeq - count + 1
  const prefix = itemName.replace(/[^A-Z0-9]/gi, '').slice(0, 3).toUpperCase()
  const lots = []
  for (let i = startSeq; i <= endSeq; i++) {
    lots.push(`${prefix}-${itemCode}-${year}-LOT-${String(i).padStart(2, '0')}`)
  }
  return lots
}

export async function createGateInward(req, res) {
  try {
    const { supplier_name, invoice_no, total_qty, uom, vehicle_no, num_packs = 1, notes } = req.body || {}
    if (!supplier_name || !total_qty || !uom)
      return res.status(400).json({ success: false, error: 'supplier_name, total_qty, uom required' })

    const gi = await prisma.gateInward.create({
      data: {
        supplierName: supplier_name,
        invoiceNo: invoice_no || null,
        totalQty: total_qty,
        uom,
        vehicleNo: vehicle_no || null,
        numPacks: Number(num_packs),
        status: 'pending_review',
        createdBy: req.user?.user_id || null,
        notes: notes || null,
      },
    })
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'gate_inward', recordId: gi.inwardId, newValue: req.body })
    return res.status(201).json({ success: true, data: gi })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getPendingReview(req, res) {
  try {
    // Needs created_by_name from users — keep as raw
    const data = await prisma.$queryRaw`
      SELECT gi.*, u.full_name AS created_by_name FROM gate_inward gi
      LEFT JOIN users u ON u.user_id = gi.created_by
      WHERE gi.status = 'pending_review' ORDER BY gi.entry_time ASC
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getQuarantineCount(req, res) {
  try {
    const count = await prisma.erpPack.count({ where: { status: 'quarantine' } })
    return res.json({ success: true, count })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function confirmItem(req, res) {
  try {
    const { item_code, unit_price } = req.body || {}
    if (!item_code) return res.status(400).json({ success: false, error: 'item_code required' })

    const item = await prisma.erpItem.findUnique({
      where: { itemCode: item_code },
      select: { itemCode: true, itemName: true },
    })
    if (!item) return res.status(404).json({ success: false, error: 'Item not found in item master' })

    const gi = await prisma.gateInward.findUnique({ where: { inwardId: req.params.id } })
    if (!gi) return res.status(404).json({ success: false, error: 'Gate inward not found' })
    if (gi.status !== 'pending_review')
      return res.status(400).json({ success: false, error: `Cannot update — current status: ${gi.status}` })

    const year = new Date().getFullYear()
    const numPacks = gi.numPacks || 1
    const lots = await generateLotNumbers(item_code, item.itemName, year, numPacks)
    const lotNumber = lots[0].replace(/-\d+$/, '')

    await prisma.gateInward.update({
      where: { inwardId: req.params.id },
      data: {
        itemCode: item_code,
        itemName: item.itemName,
        lotNumber,
        unitPrice: unit_price ? Number(unit_price) : null,
        status: 'labels_generated',
      },
    })

    const qtyPerPack = Number(gi.totalQty) / numPacks
    const verifyPackIndex = Math.floor(Math.random() * numPacks)
    const packIds = []

    for (let i = 0; i < numPacks; i++) {
      const pack = await prisma.erpPack.create({
        data: {
          inwardId: req.params.id,
          lotNumber: lots[i],
          packSeq: i + 1,
          itemCode: item_code,
          supplierName: gi.supplierName,
          invoiceNumber: gi.invoiceNo || null,
          qtyReceived: qtyPerPack,
          qtyRemaining: qtyPerPack,
          unit: gi.uom,
          status: 'quarantine',
          unitPrice: unit_price ? Number(unit_price) : null,
          verifyScanRequired: i === verifyPackIndex,
          location: null,
        },
        select: { packId: true, lotNumber: true, packSeq: true },
      })
      packIds.push(pack)
    }

    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'gate_inward', recordId: req.params.id, newValue: { item_code, unit_price, lots } })
    await prisma.gateInward.update({ where: { inwardId: req.params.id }, data: { status: 'qr_pending' } })
    return res.json({ success: true, data: { lot_number: lotNumber, packs: packIds, num_packs: numPacks } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getQrLabels(req, res) {
  try {
    const packs = await prisma.erpPack.findMany({
      where: { inwardId: req.params.id },
      include: { item: { select: { itemName: true, uom: true } } },
      orderBy: { packSeq: 'asc' },
    })
    if (!packs.length) return res.status(404).json({ success: false, error: 'No packs found for this inward' })

    const labels = []
    for (const pack of packs) {
      const qrDataUrl = await QRCode.toDataURL(pack.packId.toString(), { width: 200, margin: 1 })
      labels.push({
        pack_id: pack.packId,
        lot_number: pack.lotNumber,
        item_name: pack.item?.itemName ?? null,
        item_code: pack.itemCode,
        qty_received: pack.qtyReceived,
        unit: pack.unit,
        inward_date: pack.inwardDate,
        pack_seq: pack.packSeq,
        verify_scan_required: pack.verifyScanRequired,
        qr_data_url: qrDataUrl,
      })
    }
    return res.json({ success: true, data: labels })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function scanConfirm(req, res) {
  try {
    const { pack_id } = req.body || {}
    if (!pack_id) return res.status(400).json({ success: false, error: 'pack_id required' })

    const pack = await prisma.erpPack.findUnique({
      where: { packId: pack_id },
      include: { inward: { select: { inwardId: true } } },
    })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found' })
    if (pack.qrConfirmed) return res.json({ success: true, message: 'Already confirmed', data: pack })

    if (pack.verifyScanRequired && !pack.verifyScanDone) {
      await prisma.erpPack.update({
        where: { packId: pack_id },
        data: { qrConfirmed: true, qrConfirmedAt: new Date(), qrConfirmedBy: req.user?.user_id || null, status: 'active' },
      })
      return res.json({ success: true, verify_required: true, message: 'QR confirmed. This pack requires a SECOND PERSON verify scan to complete spot-check.', data: { pack_id, lot_number: pack.lotNumber, verify_scan_required: true } })
    }

    await prisma.erpPack.update({
      where: { packId: pack_id },
      data: { qrConfirmed: true, qrConfirmedAt: new Date(), qrConfirmedBy: req.user?.user_id || null, status: 'active' },
    })

    const remaining = await prisma.erpPack.count({
      where: { inwardId: pack.inwardId, qrConfirmed: false },
    })
    if (remaining === 0) {
      await prisma.gateInward.update({
        where: { inwardId: pack.inwardId },
        data: { status: 'confirmed', confirmedBy: req.user?.user_id || null, confirmedAt: new Date() },
      })
    }

    await writeAudit({ ...auditUser(req), action: 'QR_CONFIRM', tableName: 'erp_packs', recordId: pack_id })
    return res.json({ success: true, message: 'Pack QR confirmed. Status: active.', data: { pack_id, lot_number: pack.lotNumber } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function verifyScan(req, res) {
  try {
    const { pack_id, confirmed_item_name } = req.body || {}
    if (!pack_id) return res.status(400).json({ success: false, error: 'pack_id required' })

    const pack = await prisma.erpPack.findUnique({
      where: { packId: pack_id },
      include: { item: { select: { itemName: true } } },
    })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found' })
    if (!pack.verifyScanRequired) return res.status(400).json({ success: false, error: 'This pack does not require verify scan' })

    const itemName = pack.item?.itemName ?? ''
    if (confirmed_item_name && confirmed_item_name.toLowerCase().trim() !== itemName.toLowerCase().trim()) {
      return res.status(400).json({ success: false, error: `Item name mismatch! Label says: "${itemName}". You confirmed: "${confirmed_item_name}". Please re-check and flag for investigation.` })
    }

    await prisma.erpPack.update({
      where: { packId: pack_id },
      data: { verifyScanDone: true, verifiedBy: req.user?.user_id || null, status: 'active' },
    })
    await writeAudit({ ...auditUser(req), action: 'VERIFY_SCAN', tableName: 'erp_packs', recordId: pack_id })
    return res.json({ success: true, message: 'Spot-check verify scan completed. Pack is active.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listGateInward(req, res) {
  try {
    const { status, from, to, item_code, limit = 50, offset = 0 } = req.query
    // Needs user name joins (created_by_name, confirmed_by_name) — keep as raw
    const data = await prisma.$queryRaw`
      SELECT gi.*, u1.full_name AS created_by_name, u2.full_name AS confirmed_by_name
      FROM gate_inward gi
      LEFT JOIN users u1 ON u1.user_id = gi.created_by
      LEFT JOIN users u2 ON u2.user_id = gi.confirmed_by
      WHERE (${status || null}::text IS NULL OR gi.status = ${status || null})
        AND (${from || null}::date IS NULL OR gi.entry_time::date >= ${from || null}::date)
        AND (${to || null}::date IS NULL OR gi.entry_time::date <= ${to || null}::date)
        AND (${item_code || null}::text IS NULL OR gi.item_code = ${item_code || null})
      ORDER BY gi.entry_time DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    const total = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM gate_inward
      WHERE (${status || null}::text IS NULL OR status = ${status || null})
        AND (${item_code || null}::text IS NULL OR item_code = ${item_code || null})
    `
    return res.json({ success: true, data, total: Number(total[0].cnt) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getGateInward(req, res) {
  try {
    // Needs created_by_name — keep header fetch as raw, then use Prisma for packs
    const gi = await prisma.$queryRaw`
      SELECT gi.*, u.full_name AS created_by_name FROM gate_inward gi
      LEFT JOIN users u ON u.user_id = gi.created_by
      WHERE gi.inward_id = ${req.params.id}::uuid
    `
    if (!gi[0]) return res.status(404).json({ success: false, error: 'Not found' })

    const packs = await prisma.erpPack.findMany({
      where: { inwardId: req.params.id },
      orderBy: { packSeq: 'asc' },
    })
    return res.json({ success: true, data: { ...gi[0], packs } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function createGateOutward(req, res) {
  try {
    const { item_name, qty, uom, destination, vehicle_no, authorized_by, system_ref_type, system_ref_id, notes } = req.body || {}
    if (!item_name || !qty) return res.status(400).json({ success: false, error: 'item_name and qty required' })

    let is_unauthorised = false
    if (!system_ref_type || !system_ref_id) {
      is_unauthorised = true
    } else {
      if (system_ref_type === 'bom_issuance') {
        const ref = await prisma.erpBomIssuance.findFirst({ where: { issuanceId: system_ref_id } })
        if (!ref) is_unauthorised = true
      } else if (system_ref_type === 'order_dispatch') {
        const ref = await prisma.orderDispatch.findFirst({ where: { dispatchId: system_ref_id } })
        if (!ref) is_unauthorised = true
      }
    }

    const outward = await prisma.gateOutward.create({
      data: {
        itemName: item_name,
        qty,
        uom: uom || null,
        destination: destination || null,
        vehicleNo: vehicle_no || null,
        authorizedBy: authorized_by || null,
        isUnauthorised: is_unauthorised,
        systemRefType: system_ref_type || null,
        systemRefId: system_ref_id || null,
        createdBy: req.user?.user_id || null,
        notes: notes || null,
      },
    })

    if (is_unauthorised) {
      await createNotification({ type: 'unauthorised_outward', title: '⚠️ Unauthorised Outward Movement Detected', message: `Gate outward recorded for "${item_name}" (${qty} ${uom || ''}) to "${destination || 'unknown'}" has no matching system transaction. Authorised by: ${authorized_by || 'not specified'}.`, targetRole: 'store_manager', refType: 'gate_outward', refId: outward.outwardId })
    }
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'gate_outward', recordId: outward.outwardId, newValue: req.body })
    return res.status(201).json({ success: true, data: outward, is_unauthorised })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listGateOutward(req, res) {
  try {
    const { unauthorised_only, from, to, limit = 50, offset = 0 } = req.query
    // Needs user name join — keep as raw
    const data = await prisma.$queryRaw`
      SELECT go.*, u.full_name AS created_by_name FROM gate_outward go
      LEFT JOIN users u ON u.user_id = go.created_by
      WHERE (${unauthorised_only === 'true' ? true : null}::boolean IS NULL OR go.is_unauthorised = true)
        AND (${from || null}::date IS NULL OR go.entry_time::date >= ${from || null}::date)
        AND (${to || null}::date IS NULL OR go.entry_time::date <= ${to || null}::date)
      ORDER BY go.entry_time DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getPack(req, res) {
  try {
    const pack = await prisma.erpPack.findUnique({
      where: { packId: req.params.packId },
      include: { item: { select: { itemName: true, itemCategory: true, uom: true } } },
    })
    if (!pack) return res.status(404).json({ success: false, error: 'Pack not found' })
    return res.json({
      success: true,
      data: {
        ...pack,
        item_full_name: pack.item?.itemName ?? null,
        item_category: pack.item?.itemCategory ?? null,
        item_uom: pack.item?.uom ?? null,
        item: undefined,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listPacks(req, res) {
  try {
    const { item_code, status, lot_number, limit = 100, offset = 0 } = req.query
    const where = { qtyRemaining: { gt: 0 } }
    if (item_code) where.itemCode = item_code
    if (status) where.status = status
    if (lot_number) where.lotNumber = { contains: lot_number, mode: 'insensitive' }

    const data = await prisma.erpPack.findMany({
      where,
      include: { item: { select: { itemName: true } } },
      orderBy: [{ inwardDate: 'asc' }, { createdAt: 'asc' }],
      take: Number(limit),
      skip: Number(offset),
    })
    const result = data.map(p => ({
      ...p,
      item_name: p.item?.itemName ?? null,
      item: undefined,
    }))
    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getFifoPacks(req, res) {
  try {
    const data = await prisma.erpPack.findMany({
      where: {
        itemCode: req.params.itemCode,
        qrConfirmed: true,
        status: { in: ['active', 'partial'] },
        qtyRemaining: { gt: 0 },
      },
      include: { item: { select: { itemName: true } } },
      orderBy: [{ inwardDate: 'asc' }, { createdAt: 'asc' }],
    })
    const result = data.map(p => ({
      ...p,
      item_name: p.item?.itemName ?? null,
      item: undefined,
    }))
    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
