import prisma from '../../../db.js'
import { writeAudit, auditUser } from '../../../middleware/audit.js'
import { createNotification } from '../../../services/notification-service.js'

export async function listPendingJobs(req, res) {
  try {
    const data = await prisma.$queryRaw`
      SELECT pj.*, pp.product_code, pp.planned_qty, pp.bom_version, pp.bom_id,
             pp.di_number, so.customer_name, so.etd, so.priority,
             ee.equipment_name,
             prev_qc.result AS prev_batch_qc,
             (pj.batch_no - 1) AS prev_batch_no
      FROM production_jobs pj
      JOIN production_plans pp ON pp.plan_id = pj.plan_id
      LEFT JOIN sales_orders so ON so.di_number = pp.di_number
      LEFT JOIN erp_equipment ee ON ee.equipment_id = pj.equipment_id
      LEFT JOIN production_jobs prev_job ON prev_job.plan_id = pj.plan_id AND prev_job.batch_no = pj.batch_no - 1
      LEFT JOIN batch_qc_records prev_qc ON prev_qc.job_id = prev_job.job_id
      WHERE pp.status = 'published' AND pj.status = 'pending'
      ORDER BY so.priority DESC, so.etd ASC, pj.batch_no ASC
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function getJob(req, res) {
  try {
    const job = await prisma.$queryRaw`
      SELECT pj.*, pp.bom_id, pp.bom_version, pp.product_code, pp.planned_qty, pp.di_number
      FROM production_jobs pj JOIN production_plans pp ON pp.plan_id = pj.plan_id
      WHERE pj.job_id = ${req.params.jobId}::uuid
    `
    if (!job[0]) return res.status(404).json({ success: false, error: 'Job not found' })
    const j = job[0]

    if (j.batch_no > 1) {
      const prevJob = await prisma.$queryRaw`SELECT pj.job_id, pj.status FROM production_jobs pj WHERE pj.plan_id = ${j.plan_id}::uuid AND pj.batch_no = ${j.batch_no - 1}`
      if (prevJob[0] && !['qc_passed', 'scrapped'].includes(prevJob[0].status)) {
        return res.status(423).json({ success: false, error: `Batch ${j.batch_no} is locked. Batch ${j.batch_no - 1} must be QC passed or scrapped first.`, prev_batch_status: prevJob[0].status })
      }
    }

    const bom = await prisma.$queryRaw`SELECT * FROM bom_headers WHERE bom_id = ${j.bom_id}::uuid`
    const yieldFactor = Number(bom[0]?.yield_pct || 98) / 100
    const batchQty = Number(j.batch_qty)
    const formLines = await prisma.$queryRaw`SELECT f.*, i.item_name, i.uom, i.is_microbial FROM bom_lines_formulation f JOIN erp_items i ON i.item_code = f.item_code WHERE f.bom_id = ${j.bom_id}::uuid ORDER BY f.seq_no`
    const packLines = await prisma.$queryRaw`SELECT p.*, i.item_name, i.uom FROM bom_lines_packing p JOIN erp_items i ON i.item_code = p.item_code WHERE p.bom_id = ${j.bom_id}::uuid ORDER BY p.seq_no`

    const enrichLine = async (line, lineType) => {
      const requiredQty = Number(line.qty_per_unit) * batchQty / yieldFactor
      const issued = await prisma.$queryRaw`SELECT COALESCE(SUM(issued_qty),0) AS total_issued FROM bom_issuance WHERE job_id = ${j.job_id}::uuid AND item_code = ${line.item_code}`
      const totalIssued = Number(issued[0].total_issued)
      const packs = await prisma.$queryRaw`SELECT p.pack_id, p.lot_number, p.qty_remaining, p.inward_date, p.status, p.location FROM erp_packs p WHERE p.item_code = ${line.item_code} AND p.qr_confirmed = true AND p.status IN ('active','partial') AND p.qty_remaining > 0 ORDER BY p.inward_date ASC, p.created_at ASC`
      return { ...line, line_type: lineType, required_qty: Number(requiredQty.toFixed(6)), issued_qty: totalIssued, remaining_to_issue: Math.max(0, requiredQty - totalIssued), available_packs: packs }
    }

    const allLines = [...(await Promise.all(formLines.map(l => enrichLine(l, 'formulation')))), ...(await Promise.all(packLines.map(l => enrichLine(l, 'packing'))))]
    const existingIssuances = await prisma.$queryRaw`SELECT bi.*, p.lot_number FROM bom_issuance bi JOIN erp_packs p ON p.pack_id = bi.pack_id WHERE bi.job_id = ${j.job_id}::uuid ORDER BY bi.issued_at DESC`
    return res.json({ success: true, data: { ...j, bom: bom[0], lines: allLines, issuances: existingIssuances } })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function issueItem(req, res) {
  try {
    const { job_id, item_code, pack_id, required_qty, issued_qty } = req.body || {}
    if (!job_id || !item_code || !pack_id || issued_qty === undefined) return res.status(400).json({ success: false, error: 'job_id, item_code, pack_id, issued_qty required' })

    const job = await prisma.$queryRaw`SELECT pj.*, pp.bom_id, pp.bom_version FROM production_jobs pj JOIN production_plans pp ON pp.plan_id = pj.plan_id WHERE pj.job_id = ${job_id}::uuid AND pp.status = 'published'`
    if (!job[0]) return res.status(404).json({ success: false, error: 'Job not found or plan not published' })

    if (job[0].batch_no > 1) {
      const prevJob = await prisma.$queryRaw`SELECT status FROM production_jobs WHERE plan_id = ${job[0].plan_id}::uuid AND batch_no = ${job[0].batch_no - 1}`
      if (prevJob[0] && !['qc_passed', 'scrapped'].includes(prevJob[0].status)) {
        return res.status(423).json({ success: false, error: `Batch ${job[0].batch_no - 1} must be QC released or scrapped first.` })
      }
    }

    const pack = await prisma.$queryRaw`SELECT * FROM erp_packs WHERE pack_id = ${pack_id}::uuid AND item_code = ${item_code}`
    if (!pack[0]) return res.status(404).json({ success: false, error: 'Pack not found or item code mismatch' })
    if (!pack[0].qr_confirmed) return res.status(400).json({ success: false, error: 'Cannot issue from unconfirmed pack (quarantine)' })
    if (Number(pack[0].qty_remaining) < Number(issued_qty)) return res.status(400).json({ success: false, error: `Insufficient stock. Available: ${pack[0].qty_remaining}, Requested: ${issued_qty}` })

    const oldest = await prisma.$queryRaw`SELECT pack_id, lot_number, qty_remaining, inward_date FROM erp_packs WHERE item_code = ${item_code} AND qr_confirmed = true AND status IN ('active','partial') AND qty_remaining > 0 ORDER BY inward_date ASC, created_at ASC LIMIT 1`
    if (oldest[0] && oldest[0].pack_id.toString() !== pack_id.toString()) {
      const overrideExists = await prisma.$queryRaw`SELECT id FROM fifo_override_log WHERE job_id = ${job_id}::uuid AND item_code = ${item_code} AND selected_lot = ${pack[0].lot_number} AND created_at > NOW() - INTERVAL '1 hour'`
      if (!overrideExists[0]) {
        return res.status(409).json({ success: false, fifo_violation: true, error: `Older lot ${oldest[0].lot_number} has ${oldest[0].qty_remaining} remaining. FIFO required. Manager override needed.`, older_lot: oldest[0].lot_number, older_qty: oldest[0].qty_remaining, older_pack_id: oldest[0].pack_id })
      }
    }

    const newQty = Number(pack[0].qty_remaining) - Number(issued_qty)
    await prisma.$executeRaw`UPDATE erp_packs SET qty_remaining = ${newQty}, status = CASE WHEN ${newQty} = 0 THEN 'exhausted' ELSE 'partial' END, updated_at = NOW() WHERE pack_id = ${pack_id}::uuid`

    const issuance = await prisma.$queryRaw`
      INSERT INTO bom_issuance (job_id, item_code, pack_id, required_qty, issued_qty, issued_by, fifo_override)
      VALUES (${job_id}::uuid, ${item_code}, ${pack_id}::uuid, ${required_qty || 0}, ${issued_qty}, ${req.user?.user_id || null}::uuid, ${oldest[0] && oldest[0].pack_id.toString() !== pack_id.toString()})
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'BOM_ISSUE', tableName: 'bom_issuance', recordId: issuance[0].issuance_id, newValue: { job_id, item_code, pack_id, issued_qty } })
    return res.status(201).json({ success: true, data: issuance[0] })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function scrapBatch(req, res) {
  try {
    const { reason_code, notes } = req.body || {}
    if (!reason_code) return res.status(400).json({ success: false, error: 'reason_code required for scrap' })
    const job = await prisma.$queryRaw`SELECT * FROM production_jobs WHERE job_id = ${req.params.id}::uuid`
    if (!job[0]) return res.status(404).json({ success: false, error: 'Job not found' })
    const issuances = await prisma.$queryRaw`SELECT bi.*, p.item_code FROM bom_issuance bi JOIN erp_packs p ON p.pack_id = bi.pack_id WHERE bi.job_id = ${req.params.id}::uuid`
    for (const iss of issuances) {
      await prisma.$executeRaw`INSERT INTO production_loss_log (job_id, item_code, qty_lost, reason_code, notes, logged_by) VALUES (${req.params.id}::uuid, ${iss.item_code}, ${iss.issued_qty}, ${reason_code}, ${notes || null}, ${req.user?.user_id || null}::uuid)`
    }
    await prisma.$executeRaw`UPDATE production_jobs SET status = 'scrapped', delay_reason_code = ${reason_code}, delay_notes = ${notes || null}, actual_end_time = NOW(), updated_at = NOW() WHERE job_id = ${req.params.id}::uuid`
    await writeAudit({ ...auditUser(req), action: 'SCRAP', tableName: 'production_jobs', recordId: req.params.id, newValue: req.body })
    return res.json({ success: true, message: 'Batch scrapped. Materials written off to production_loss_log.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function reprocessBatch(req, res) {
  try {
    const origJob = await prisma.$queryRaw`SELECT * FROM production_jobs WHERE job_id = ${req.params.id}::uuid`
    if (!origJob[0]) return res.status(404).json({ success: false, error: 'Job not found' })
    await prisma.$executeRaw`UPDATE production_jobs SET status = 'failed', actual_end_time = NOW(), updated_at = NOW() WHERE job_id = ${req.params.id}::uuid`
    const reprocessJob = await prisma.$queryRaw`
      INSERT INTO production_jobs (plan_id, batch_no, batch_code, product_code, equipment_id, batch_qty, status)
      VALUES (${origJob[0].plan_id}::uuid, ${origJob[0].batch_no}, ${origJob[0].batch_code + '-REWORK'}, ${origJob[0].product_code}, ${origJob[0].equipment_id}::uuid, ${origJob[0].batch_qty}, 'pending')
      RETURNING *
    `
    await writeAudit({ ...auditUser(req), action: 'REPROCESS', tableName: 'production_jobs', recordId: req.params.id, newValue: { reprocess_job_id: reprocessJob[0].job_id } })
    return res.status(201).json({ success: true, data: reprocessJob[0], message: 'Reprocess job created. Issue BOM again for the new job.' })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

export async function listHistory(req, res) {
  try {
    const { job_id, item_code, limit = 100, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT bi.*, p.lot_number, p.item_code AS pack_item, u.full_name AS issued_by_name
      FROM bom_issuance bi
      JOIN erp_packs p ON p.pack_id = bi.pack_id
      LEFT JOIN users u ON u.user_id = bi.issued_by
      WHERE (${job_id || null}::uuid IS NULL OR bi.job_id = ${job_id || null}::uuid)
        AND (${item_code || null}::text IS NULL OR bi.item_code = ${item_code || null})
      ORDER BY bi.issued_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return res.json({ success: true, data })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
