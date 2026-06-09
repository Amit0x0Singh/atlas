import prisma from "../../../../db.js";
import { writeAudit, auditUser } from "../../../../middleware/audit.js";
import { createNotification } from "../../../../services/notification-service.js";

export async function createWarehouseTransfer(req, res) {
  const { pack_id, transfer_type, from_location, to_location, from_plant_id, to_plant_id, notes } = req.body || {};
  if (!pack_id || !transfer_type) {
    return res.status(400).json({ success: false, error: "pack_id and transfer_type required" });
  }

  try {
    const pack = await prisma.$queryRaw`SELECT * FROM erp_packs WHERE pack_id = ${pack_id}::uuid`;
    if (!pack[0]) return res.status(404).json({ success: false, error: "Pack not found" });
    if (!pack[0].qr_confirmed) return res.status(400).json({ success: false, error: "Pack must be QR-confirmed before transfer" });

    if (transfer_type === "intra_plant") {
      await prisma.$executeRaw`UPDATE erp_packs SET location = ${to_location}, updated_at = NOW() WHERE pack_id = ${pack_id}::uuid`;
      const rows = await prisma.$queryRaw`
        INSERT INTO warehouse_transfers (pack_id, transfer_type, from_location, to_location,
          from_plant_id, to_plant_id, initiated_by, status, notes)
        VALUES (${pack_id}::uuid, ${transfer_type}, ${from_location || pack[0].location},
                ${to_location}, ${from_plant_id || null}::uuid, ${to_plant_id || null}::uuid,
                ${req.user?.user_id || null}::uuid, 'completed', ${notes || null})
        RETURNING *
      `;
      await writeAudit({ ...auditUser(req), action: "TRANSFER", tableName: "warehouse_transfers", recordId: rows[0].transfer_id, newValue: req.body });
      return res.status(201).json({ success: true, data: rows[0], message: "Intra-plant transfer completed" });
    }

    const rows = await prisma.$queryRaw`
      INSERT INTO warehouse_transfers (pack_id, transfer_type, from_location, to_location,
        from_plant_id, to_plant_id, initiated_by, status, notes)
      VALUES (${pack_id}::uuid, ${transfer_type}, ${from_location || pack[0].location},
              ${to_location || null}, ${from_plant_id || null}::uuid, ${to_plant_id || null}::uuid,
              ${req.user?.user_id || null}::uuid, 'pending', ${notes || null})
      RETURNING *
    `;
    await prisma.$executeRaw`UPDATE erp_packs SET status = 'in_transit', updated_at = NOW() WHERE pack_id = ${pack_id}::uuid`;

    await createNotification({
      type: "transfer_pending",
      title: "Inter-plant Transfer Pending Receipt",
      message: `Pack ${pack[0].lot_number} (${pack[0].item_code}) transferred from ${from_location || "current location"} to ${to_location || "new plant"}. Please scan and accept at receiving end.`,
      targetRole: "store_person", refType: "warehouse_transfer", refId: rows[0].transfer_id,
    });

    await writeAudit({ ...auditUser(req), action: "CREATE", tableName: "warehouse_transfers", recordId: rows[0].transfer_id, newValue: req.body });
    return res.status(201).json({ success: true, data: rows[0], message: "Inter-plant transfer initiated. Pending receipt at destination." });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function receiveWarehouseTransfer(req, res) {
  try {
    const { to_location } = req.body || {};
    const transfer = await prisma.$queryRaw`SELECT * FROM warehouse_transfers WHERE transfer_id = ${req.params.id}::uuid`;
    if (!transfer[0]) return res.status(404).json({ success: false, error: "Transfer not found" });
    if (transfer[0].status !== "pending") return res.status(400).json({ success: false, error: "Transfer is not pending" });

    await prisma.$executeRaw`
      UPDATE erp_packs SET
        location = ${to_location || transfer[0].to_location},
        status = 'active', updated_at = NOW()
      WHERE pack_id = ${transfer[0].pack_id}::uuid
    `;
    await prisma.$executeRaw`
      UPDATE warehouse_transfers SET status = 'completed',
        received_by = ${req.user?.user_id || null}::uuid, received_at = NOW(),
        to_location = COALESCE(${to_location || null}, to_location)
      WHERE transfer_id = ${req.params.id}::uuid
    `;
    await writeAudit({ ...auditUser(req), action: "RECEIVE", tableName: "warehouse_transfers", recordId: req.params.id });
    return res.json({ success: true, message: "Transfer received and pack is now active at new location" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export async function listWarehouseTransfers(req, res) {
  try {
    const { status, limit = 50, offset = 0 } = req.query;
    const data = await prisma.$queryRaw`
      SELECT wt.*, p.lot_number, p.item_code, u.full_name AS initiated_by_name
      FROM warehouse_transfers wt
      JOIN erp_packs p ON p.pack_id = wt.pack_id
      LEFT JOIN users u ON u.user_id = wt.initiated_by
      WHERE (${status || null}::text IS NULL OR wt.status = ${status || null})
      ORDER BY wt.initiated_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}
