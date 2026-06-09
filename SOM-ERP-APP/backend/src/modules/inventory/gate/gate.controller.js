import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { createNotification } from '../../../services/notification-service.js'
import QRCode from 'qrcode'

async function generateLotNumbers(itemCode, itemName, year, count) {
  await prisma.$executeRaw`
    INSERT INTO gate_lot_sequences (item_code, year, seq) VALUES (${itemCode}, ${year}, 0)
    ON CONFLICT (item_code, year) DO NOTHING
  `
  const rows = await prisma.$queryRaw`
    UPDATE gate_lot_sequences SET seq = seq + ${count}
    WHERE item_code = ${itemCode} AND year = ${year}
    RETURNING seq
  `
  const endSeq = Number(rows[0].seq)
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
    const rows = await prisma.$queryRaw`
      INSERT INTO gate_inward (supplier_name, invoice_no, total_qty, uom, vehicle_no, num_packs, status, created_by, notes)
      VALUES (${supplier_name}, ${invoice_no || null}, ${total_qty}, ${uom}, ${vehicle_no || null}, ${num_packs}, 'pending_review', ${req.user?.user_id || null}::uuid, ${notes || null})
      RETURNING *
    `
    const gi = rows[0]
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'gate_inward', recordId: gi.inward_id, newValue: req.body })
    return res.status(201).json({ success: true, data: gi })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getPendingReview(req, res) {
  try {
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
    const rows = await prisma.$queryRaw`SELECT COUNT(*) AS count FROM erp_packs WHERE status = 'quarantine'`
    return res.json({ success: true, count: Number(rows[0].count) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function confirmItem(req, res) {
  try {
    const { item_code, unit_price } = req.body || {}
    if (!item_code) return res.status(400).json({ success: false, error: 'item_code required' })
    const items = await prisma.$queryRaw`SELECT item_code, item_name FROM erp_items WHERE item_code = ${item_code}`
    if (!items[0]) return res.status(404).json({ success: false, error: 'Item not found in item master' })
    const gi = await prisma.$queryRaw`SELECT * FROM gate_inward WHERE inward_id = ${req.params.id}::uuid`
    if (!gi[0]) return res.status(404).json({ success: false, error: 'Gate inward not found' })
    if (gi[0].status !== 'pending_review')
      return res.status(400).json({ success: false, error: `Cannot update — current status: ${gi[0].status}` })
    const item = items[0]
    const year = new Date().getFullYear()
    const numPacks = gi[0].num_packs || 1
    const lots = await generateLotNumbers(item_code, item.item_name, year, numPacks)
    const lotNumber = lots[0].replace(/-\d+$/, '')
    await prisma.$executeRaw`
      UPDATE gate_inward SET item_code = ${item_code}, item_name = ${item.item_name},
        lot_number = ${lotNumber}, unit_price = ${unit_price || null},
        status = 'labels_generated', updated_at = NOW()
      WHERE inward_id = ${req.params.id}::uuid
    `
    const qtyPerPack = Number(gi[0].total_qty) / numPacks
    const verifyPackIndex = Math.floor(Math.random() * numPacks)
    const packIds = []
    for (let i = 0; i < numPacks; i++) {
      const packRows = await prisma.$queryRaw`
        INSERT INTO erp_packs (inward_id, lot_number, pack_seq, item_code, supplier_name, invoice_number, qty_received, qty_remaining, unit, inward_date, status, unit_price, verify_scan_required, location)
        VALUES (${req.params.id}::uuid, ${lots[i]}, ${i + 1}, ${item_code}, ${gi[0].supplier_name}, ${gi[0].invoice_no || null}, ${qtyPerPack}, ${qtyPerPack}, ${gi[0].uom}, CURRENT_DATE, 'quarantine', ${unit_price || null}, ${i === verifyPackIndex}, NULL)
        RETURNING pack_id, lot_number, pack_seq
      `
      packIds.push(packRows[0])
    }
    await writeAudit({ ...auditUser(req), action: 'UPDATE', tableName: 'gate_inward', recordId: req.params.id, newValue: { item_code, unit_price, lots } })
    await prisma.$executeRaw`UPDATE gate_inward SET status = 'qr_pending', updated_at = NOW() WHERE inward_id = ${req.params.id}::uuid`
    return res.json({ success: true, data: { lot_number: lotNumber, packs: packIds, num_packs: numPacks } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getQrLabels(req, res) {
  try {
    const packs = await prisma.$queryRaw`
      SELECT p.*, i.item_name, i.uom FROM erp_packs p JOIN erp_items i ON i.item_code = p.item_code
      WHERE p.inward_id = ${req.params.id}::uuid ORDER BY p.pack_seq
    `
    if (!packs.length) return res.status(404).json({ success: false, error: 'No packs found for this inward' })
    const labels = []
    for (const pack of packs) {
      const qrDataUrl = await QRCode.toDataURL(pack.pack_id.toString(), { width: 200, margin: 1 })
      labels.push({ pack_id: pack.pack_id, lot_number: pack.lot_number, item_name: pack.item_name, item_code: pack.item_code, qty_received: pack.qty_received, unit: pack.unit, inward_date: pack.inward_date, pack_seq: pack.pack_seq, verify_scan_required: pack.verify_scan_required, qr_data_url: qrDataUrl })
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
    const packs = await prisma.$queryRaw`
      SELECT p.*, gi.item_code AS gi_item_code FROM erp_packs p JOIN gate_inward gi ON gi.inward_id = p.inward_id WHERE p.pack_id = ${pack_id}::uuid
    `
    if (!packs[0]) return res.status(404).json({ success: false, error: 'Pack not found' })
    const pack = packs[0]
    if (pack.qr_confirmed) return res.json({ success: true, message: 'Already confirmed', data: pack })
    if (pack.verify_scan_required && !pack.verify_scan_done) {
      await prisma.$executeRaw`UPDATE erp_packs SET qr_confirmed = true, qr_confirmed_at = NOW(), qr_confirmed_by = ${req.user?.user_id || null}::uuid, status = 'active', updated_at = NOW() WHERE pack_id = ${pack_id}::uuid`
      return res.json({ success: true, verify_required: true, message: 'QR confirmed. This pack requires a SECOND PERSON verify scan to complete spot-check.', data: { pack_id, lot_number: pack.lot_number, verify_scan_required: true } })
    }
    await prisma.$executeRaw`UPDATE erp_packs SET qr_confirmed = true, qr_confirmed_at = NOW(), qr_confirmed_by = ${req.user?.user_id || null}::uuid, status = 'active', updated_at = NOW() WHERE pack_id = ${pack_id}::uuid`
    const remaining = await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM erp_packs WHERE inward_id = ${pack.inward_id}::uuid AND qr_confirmed = false`
    if (Number(remaining[0].cnt) === 0) {
      await prisma.$executeRaw`UPDATE gate_inward SET status = 'confirmed', confirmed_by = ${req.user?.user_id || null}::uuid, confirmed_at = NOW(), updated_at = NOW() WHERE inward_id = ${pack.inward_id}::uuid`
    }
    await writeAudit({ ...auditUser(req), action: 'QR_CONFIRM', tableName: 'erp_packs', recordId: pack_id })
    return res.json({ success: true, message: 'Pack QR confirmed. Status: active.', data: { pack_id, lot_number: pack.lot_number } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function verifyScan(req, res) {
  try {
    const { pack_id, confirmed_item_name } = req.body || {}
    if (!pack_id) return res.status(400).json({ success: false, error: 'pack_id required' })
    const packs = await prisma.$queryRaw`SELECT p.*, i.item_name FROM erp_packs p JOIN erp_items i ON i.item_code = p.item_code WHERE p.pack_id = ${pack_id}::uuid`
    if (!packs[0]) return res.status(404).json({ success: false, error: 'Pack not found' })
    const pack = packs[0]
    if (!pack.verify_scan_required) return res.status(400).json({ success: false, error: 'This pack does not require verify scan' })
    if (confirmed_item_name && confirmed_item_name.toLowerCase().trim() !== pack.item_name.toLowerCase().trim()) {
      return res.status(400).json({ success: false, error: `Item name mismatch! Label says: "${pack.item_name}". You confirmed: "${confirmed_item_name}". Please re-check and flag for investigation.` })
    }
    await prisma.$executeRaw`UPDATE erp_packs SET verify_scan_done = true, verified_by = ${req.user?.user_id || null}::uuid, status = 'active', updated_at = NOW() WHERE pack_id = ${pack_id}::uuid`
    await writeAudit({ ...auditUser(req), action: 'VERIFY_SCAN', tableName: 'erp_packs', recordId: pack_id })
    return res.json({ success: true, message: 'Spot-check verify scan completed. Pack is active.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listGateInward(req, res) {
  try {
    const { status, from, to, item_code, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT gi.*, u1.full_name AS created_by_name, u2.full_name AS confirmed_by_name
      FROM gate_inward gi LEFT JOIN users u1 ON u1.user_id = gi.created_by LEFT JOIN users u2 ON u2.user_id = gi.confirmed_by
      WHERE (${status || null}::text IS NULL OR gi.status = ${status || null})
        AND (${from || null}::date IS NULL OR gi.entry_time::date >= ${from || null}::date)
        AND (${to || null}::date IS NULL OR gi.entry_time::date <= ${to || null}::date)
        AND (${item_code || null}::text IS NULL OR gi.item_code = ${item_code || null})
      ORDER BY gi.entry_time DESC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    const total = await prisma.$queryRaw`SELECT COUNT(*) AS cnt FROM gate_inward WHERE (${status || null}::text IS NULL OR status = ${status || null}) AND (${item_code || null}::text IS NULL OR item_code = ${item_code || null})`
    return res.json({ success: true, data, total: Number(total[0].cnt) })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getGateInward(req, res) {
  try {
    const gi = await prisma.$queryRaw`SELECT gi.*, u.full_name AS created_by_name FROM gate_inward gi LEFT JOIN users u ON u.user_id = gi.created_by WHERE gi.inward_id = ${req.params.id}::uuid`
    if (!gi[0]) return res.status(404).json({ success: false, error: 'Not found' })
    const packs = await prisma.$queryRaw`SELECT * FROM erp_packs WHERE inward_id = ${req.params.id}::uuid ORDER BY pack_seq`
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
        const ref = await prisma.$queryRaw`SELECT issuance_id FROM bom_issuance WHERE issuance_id = ${system_ref_id}::uuid LIMIT 1`
        if (!ref[0]) is_unauthorised = true
      } else if (system_ref_type === 'order_dispatch') {
        const ref = await prisma.$queryRaw`SELECT dispatch_id FROM order_dispatch WHERE dispatch_id = ${system_ref_id}::uuid LIMIT 1`
        if (!ref[0]) is_unauthorised = true
      }
    }
    const rows = await prisma.$queryRaw`
      INSERT INTO gate_outward (item_name, qty, uom, destination, vehicle_no, authorized_by, is_unauthorised, system_ref_type, system_ref_id, created_by, notes)
      VALUES (${item_name}, ${qty}, ${uom || null}, ${destination || null}, ${vehicle_no || null}, ${authorized_by || null}, ${is_unauthorised}, ${system_ref_type || null}, ${system_ref_id || null}::uuid, ${req.user?.user_id || null}::uuid, ${notes || null})
      RETURNING *
    `
    if (is_unauthorised) {
      await createNotification({ type: 'unauthorised_outward', title: '⚠️ Unauthorised Outward Movement Detected', message: `Gate outward recorded for "${item_name}" (${qty} ${uom || ''}) to "${destination || 'unknown'}" has no matching system transaction. Authorised by: ${authorized_by || 'not specified'}.`, targetRole: 'store_manager', refType: 'gate_outward', refId: rows[0].outward_id })
    }
    await writeAudit({ ...auditUser(req), action: 'CREATE', tableName: 'gate_outward', recordId: rows[0].outward_id, newValue: req.body })
    return res.status(201).json({ success: true, data: rows[0], is_unauthorised })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listGateOutward(req, res) {
  try {
    const { unauthorised_only, from, to, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT go.*, u.full_name AS created_by_name FROM gate_outward go LEFT JOIN users u ON u.user_id = go.created_by
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
    const rows = await prisma.$queryRaw`
      SELECT p.*, i.item_name AS item_full_name, i.item_category, i.uom AS item_uom FROM erp_packs p JOIN erp_items i ON i.item_code = p.item_code WHERE p.pack_id = ${req.params.packId}::uuid
    `
    if (!rows[0]) return res.status(404).json({ success: false, error: 'Pack not found' })
    return res.json({ success: true, data: rows[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listPacks(req, res) {
  try {
    const { item_code, status, lot_number, limit = 100, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT p.*, i.item_name FROM erp_packs p JOIN erp_items i ON i.item_code = p.item_code
      WHERE (${item_code || null}::text IS NULL OR p.item_code = ${item_code || null})
        AND (${status || null}::text IS NULL OR p.status = ${status || null})
        AND (${lot_number || null}::text IS NULL OR p.lot_number ILIKE ${'%' + (lot_number || '') + '%'})
        AND p.qty_remaining > 0
      ORDER BY p.inward_date ASC, p.created_at ASC LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getFifoPacks(req, res) {
  try {
    const data = await prisma.$queryRaw`
      SELECT p.*, i.item_name FROM erp_packs p JOIN erp_items i ON i.item_code = p.item_code
      WHERE p.item_code = ${req.params.itemCode} AND p.qr_confirmed = true AND p.status IN ('active','partial') AND p.qty_remaining > 0
      ORDER BY p.inward_date ASC, p.created_at ASC
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
