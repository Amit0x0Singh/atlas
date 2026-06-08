import prisma from "../../db.js";
import { writeAudit, auditUser } from "../../middleware/audit.js";
import { createNotification } from "../../services/notification-service.js";

export async function createDecanting(req, reply) {
  const { source_pack_id, target_container_id, qty_to_transfer, qty_actual } =
    req.body || {};
  if (
    !source_pack_id ||
    !target_container_id ||
    qty_to_transfer === undefined
  ) {
    return reply
      .status(400)
      .send({
        success: false,
        error: "source_pack_id, target_container_id, qty_to_transfer required",
      });
  }

  const pack =
    await prisma.$queryRaw`SELECT * FROM erp_packs WHERE pack_id = ${source_pack_id}::uuid`;
  if (!pack[0])
    return reply
      .status(404)
      .send({ success: false, error: "Source pack not found" });
  if (!pack[0].qr_confirmed)
    return reply
      .status(400)
      .send({ success: false, error: "Source pack not QR confirmed" });
  if (Number(pack[0].qty_remaining) < Number(qty_to_transfer)) {
    return reply
      .status(400)
      .send({
        success: false,
        error: `Insufficient qty. Available: ${pack[0].qty_remaining}`,
      });
  }

  const container =
    await prisma.$queryRaw`SELECT * FROM erp_containers WHERE container_id = ${target_container_id}`;
  if (!container[0])
    return reply
      .status(404)
      .send({ success: false, error: "Target container not found" });
  if (container[0].item_code !== pack[0].item_code) {
    return reply
      .status(400)
      .send({
        success: false,
        error: `Container is for ${container[0].item_code}, pack is ${pack[0].item_code}. Item mismatch.`,
      });
  }

  const actualQty =
    qty_actual !== undefined ? Number(qty_actual) : Number(qty_to_transfer);
  const item =
    await prisma.$queryRaw`SELECT decanting_tolerance_pct FROM erp_items WHERE item_code = ${pack[0].item_code}`;
  const tolerancePct = Number(item[0]?.decanting_tolerance_pct || 0.5);
  const variancePct =
    (Math.abs(actualQty - Number(qty_to_transfer)) / Number(qty_to_transfer)) *
    100;
  const needsApproval = variancePct > tolerancePct;

  if (needsApproval && !req.body.supervisor_approved) {
    return reply.status(422).send({
      success: false,
      needs_approval: true,
      variance_pct: variancePct.toFixed(3),
      tolerance_pct: tolerancePct,
      message: `Actual qty (${actualQty}) differs from entered qty (${qty_to_transfer}) by ${variancePct.toFixed(2)}%, which exceeds tolerance of ${tolerancePct}%. Supervisor approval required.`,
    });
  }

  const newPackQty = Number(pack[0].qty_remaining) - actualQty;
  const newContainerQty = Number(container[0].current_qty) + actualQty;

  if (newContainerQty > Number(container[0].max_capacity)) {
    return reply
      .status(400)
      .send({
        success: false,
        error: `Container overflow. Max capacity: ${container[0].max_capacity}, current: ${container[0].current_qty}, adding: ${actualQty}`,
      });
  }

  await prisma.$executeRaw`
    UPDATE erp_packs SET qty_remaining = ${newPackQty},
      status = CASE WHEN ${newPackQty} = 0 THEN 'exhausted' ELSE 'partial' END,
      updated_at = NOW()
    WHERE pack_id = ${source_pack_id}::uuid
  `;
  await prisma.$executeRaw`
    UPDATE erp_containers SET current_qty = ${newContainerQty}, last_replenished_at = NOW(), updated_at = NOW()
    WHERE container_id = ${target_container_id}
  `;

  const log = await prisma.$queryRaw`
    INSERT INTO decanting_log (source_pack_id, target_container, qty_entered, qty_actual,
      variance_pct, tolerance_pct, needs_approval, approved_by, performed_by, status)
    VALUES (${source_pack_id}::uuid, ${target_container_id}, ${qty_to_transfer}, ${actualQty},
            ${variancePct}, ${tolerancePct}, ${needsApproval},
            ${req.body.supervisor_approved ? req.user?.user_id || null : null}::uuid,
            ${req.user?.user_id || null}::uuid, 'completed')
    RETURNING *
  `;

  if (newContainerQty <= Number(container[0].low_stock_threshold)) {
    await createNotification({
      type: "rm_reorder",
      title: `Container Low Stock: ${container[0].container_id}`,
      message: `Container ${container[0].container_id} (${pack[0].item_code}) is at ${newContainerQty} ${pack[0].unit}, below threshold of ${container[0].low_stock_threshold}. Replenishment needed.`,
      targetRole: "store_manager",
      refType: "erp_container",
      refId: target_container_id,
    });
  }

  await writeAudit({
    ...auditUser(req),
    action: "DECANT",
    tableName: "decanting_log",
    recordId: log[0].id,
    newValue: req.body,
  });
  return reply.status(201).send({ success: true, data: log[0] });
}

export async function listDecanting(req) {
  const { pack_id, limit = 50, offset = 0 } = req.query;
  const data = await prisma.$queryRaw`
    SELECT dl.*, p.lot_number, p.item_code, u.full_name AS performed_by_name
    FROM decanting_log dl
    JOIN erp_packs p ON p.pack_id = dl.source_pack_id
    LEFT JOIN users u ON u.user_id = dl.performed_by
    WHERE (${pack_id || null}::uuid IS NULL OR dl.source_pack_id = ${pack_id || null}::uuid)
    ORDER BY dl.created_at DESC
    LIMIT ${Number(limit)} OFFSET ${Number(offset)}
  `;
  return { success: true, data };
}
