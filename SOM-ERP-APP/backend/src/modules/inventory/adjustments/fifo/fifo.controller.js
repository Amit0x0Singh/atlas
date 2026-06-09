import prisma from "../../../../db.js";
import { writeAudit, auditUser } from "../../../../middleware/audit.js";

export async function checkFifo(req, res) {
  const { item_code, selected_pack_id } = req.body || {};
  if (!item_code || !selected_pack_id) {
    return res.status(400).json({ success: false, error: "item_code and selected_pack_id required" });
  }

  try {
    const oldest = await prisma.$queryRaw`
      SELECT pack_id, lot_number, qty_remaining, inward_date FROM erp_packs
      WHERE item_code = ${item_code}
        AND qr_confirmed = true
        AND status IN ('active', 'partial')
        AND qty_remaining > 0
      ORDER BY inward_date ASC, created_at ASC
      LIMIT 1
    `;
    if (!oldest[0]) return res.json({ success: true, fifo_ok: true });
    if (oldest[0].pack_id.toString() === selected_pack_id.toString())
      return res.json({ success: true, fifo_ok: true });

    return res.json({
      success: true, fifo_ok: false,
      oldest_lot: oldest[0].lot_number, oldest_qty: oldest[0].qty_remaining,
      oldest_inward_date: oldest[0].inward_date, oldest_pack_id: oldest[0].pack_id,
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function createFifoOverride(req, res) {
  const { job_id, item_code, older_lot, older_qty, selected_lot, reason } = req.body || {};
  if (!reason) return res.status(400).json({ success: false, error: "reason is mandatory for FIFO override" });

  try {
    const rows = await prisma.$queryRaw`
      INSERT INTO fifo_override_log (job_id, item_code, older_lot, older_qty, selected_lot, override_by, reason)
      VALUES (${job_id || null}::uuid, ${item_code || null}, ${older_lot || null},
              ${older_qty || null}, ${selected_lot || null},
              ${req.user?.user_id || null}::uuid, ${reason})
      RETURNING *
    `;
    await writeAudit({ ...auditUser(req), action: "FIFO_OVERRIDE", tableName: "fifo_override_log", recordId: rows[0].id, newValue: req.body });
    return res.status(201).json({ success: true, data: rows[0], message: "FIFO override logged. You may proceed with selected lot." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
