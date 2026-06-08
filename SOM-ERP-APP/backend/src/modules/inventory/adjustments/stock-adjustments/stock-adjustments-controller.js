import prisma from "../../db.js";
import { writeAudit, auditUser } from "../../middleware/audit.js";
import { createNotification } from "../../services/notification-service.js";

export async function createStockAdjustment(req, reply) {
  const { pack_id, reason_code, qty_after, notes } = req.body || {};
  if (!pack_id || !reason_code || qty_after === undefined) {
    return reply
      .status(400)
      .send({
        success: false,
        error: "pack_id, reason_code, qty_after required",
      });
  }

  const rc = await prisma.$queryRaw`
    SELECT code FROM reason_codes WHERE category = 'stock_adjustment' AND code = ${reason_code} AND is_active = true
  `;
  if (!rc[0]) {
    return reply
      .status(400)
      .send({
        success: false,
        error: `Invalid reason_code: ${reason_code}. Must be from predefined list.`,
      });
  }

  const pack =
    await prisma.$queryRaw`SELECT * FROM erp_packs WHERE pack_id = ${pack_id}::uuid`;
  if (!pack[0])
    return reply.status(404).send({ success: false, error: "Pack not found" });
  if (!pack[0].qr_confirmed) {
    return reply
      .status(400)
      .send({
        success: false,
        error: "Cannot adjust pack without QR confirmation",
      });
  }

  const qty_before = Number(pack[0].qty_remaining);
  const delta = Number(qty_after) - qty_before;

  const rows = await prisma.$queryRaw`
    INSERT INTO stock_adjustments (pack_id, item_code, reason_code, qty_before, qty_after, delta,
      raised_by, status, notes)
    VALUES (${pack_id}::uuid, ${pack[0].item_code}, ${reason_code}, ${qty_before}, ${qty_after},
            ${delta}, ${req.user?.user_id || null}::uuid, 'pending', ${notes || null})
    RETURNING *
  `;
  const adj = rows[0];

  await createNotification({
    type: "adj_pending_approval",
    title: "Stock Adjustment Pending Approval",
    message: `Adjustment for pack ${pack[0].lot_number} (${pack[0].item_code}): ${qty_before} -> ${qty_after} (${delta > 0 ? "+" : ""}${delta}). Reason: ${reason_code}. Raised by: ${req.user?.full_name || req.user?.username}.`,
    targetRole: "store_manager",
    refType: "stock_adjustment",
    refId: adj.adjustment_id,
  });

  await writeAudit({
    ...auditUser(req),
    action: "CREATE",
    tableName: "stock_adjustments",
    recordId: adj.adjustment_id,
    newValue: req.body,
  });
  return reply.status(201).send({ success: true, data: adj });
}

export async function approveStockAdjustment(req, reply) {
  const adj = await prisma.$queryRaw`
    SELECT * FROM stock_adjustments WHERE adjustment_id = ${req.params.id}::uuid
  `;
  if (!adj[0])
    return reply
      .status(404)
      .send({ success: false, error: "Adjustment not found" });
  if (adj[0].status !== "pending")
    return reply
      .status(400)
      .send({ success: false, error: "Adjustment is not pending" });

  if (adj[0].raised_by?.toString() === req.user?.user_id?.toString()) {
    return reply
      .status(403)
      .send({
        success: false,
        error:
          "Cannot approve your own adjustment. Two separate logins required.",
      });
  }

  await prisma.$executeRaw`
    UPDATE erp_packs SET
      qty_remaining = ${adj[0].qty_after},
      status = CASE
        WHEN ${adj[0].qty_after} = 0 THEN 'exhausted'
        WHEN ${adj[0].qty_after} < qty_received THEN 'partial'
        ELSE status
      END,
      updated_at = NOW()
    WHERE pack_id = ${adj[0].pack_id}::uuid
  `;
  await prisma.$executeRaw`
    UPDATE stock_adjustments SET status = 'approved', approved_by = ${req.user?.user_id || null}::uuid,
      approved_at = NOW()
    WHERE adjustment_id = ${req.params.id}::uuid
  `;

  await writeAudit({
    ...auditUser(req),
    action: "APPROVE",
    tableName: "stock_adjustments",
    recordId: req.params.id,
    newValue: { approved: true, qty_applied: adj[0].qty_after },
  });
  return { success: true, message: "Adjustment approved and applied" };
}

export async function rejectStockAdjustment(req) {
  await prisma.$executeRaw`
    UPDATE stock_adjustments SET status = 'rejected', approved_by = ${req.user?.user_id || null}::uuid,
      approved_at = NOW(), notes = CONCAT(notes, ' | Rejected: ', ${req.body?.reason || ""})
    WHERE adjustment_id = ${req.params.id}::uuid AND status = 'pending'
  `;
  await writeAudit({
    ...auditUser(req),
    action: "REJECT",
    tableName: "stock_adjustments",
    recordId: req.params.id,
  });
  return { success: true, message: "Adjustment rejected" };
}

export async function listStockAdjustments(req) {
  const { status, limit = 50, offset = 0 } = req.query;
  const data = await prisma.$queryRaw`
    SELECT sa.*, p.lot_number, p.item_code,
           u1.full_name AS raised_by_name, u2.full_name AS approved_by_name
    FROM stock_adjustments sa
    JOIN erp_packs p ON p.pack_id = sa.pack_id
    LEFT JOIN users u1 ON u1.user_id = sa.raised_by
    LEFT JOIN users u2 ON u2.user_id = sa.approved_by
    WHERE (${status || null}::text IS NULL OR sa.status = ${status || null})
    ORDER BY sa.raised_at DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;
  return { success: true, data };
}
