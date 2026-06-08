import prisma from "../../../db.js";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { writeAudit, auditUser } from "../../../middleware/audit.js";

// GET /api/erp/notifications
export async function getMyNotifications(req, res) {
  try {
    const { unread_only, limit = 50, offset = 0 } = req.query;
    const data = await prisma.$queryRaw`
      SELECT n.*
      FROM notifications n
      WHERE (n.target_user_id = ${req.user.user_id}::uuid
             OR n.target_role = ${req.user.role})
        AND (${unread_only === "true" ? true : null}::boolean IS NULL OR n.is_read = false)
      ORDER BY n.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    const unreadCount = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM notifications
      WHERE (target_user_id = ${req.user.user_id}::uuid OR target_role = ${req.user.role})
        AND is_read = false
    `;
    return res.json({
      success: true,
      data,
      unread_count: Number(unreadCount[0].cnt),
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PATCH /api/erp/notifications/:id/read
export async function markNotificationRead(req, res) {
  try {
    await prisma.$executeRaw`
      UPDATE notifications SET is_read = true WHERE notif_id = ${req.params.id}::uuid
    `;
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PATCH /api/erp/notifications/read-all
export async function markAllNotificationsRead(req, res) {
  try {
    await prisma.$executeRaw`
      UPDATE notifications SET is_read = true
      WHERE (target_user_id = ${req.user.user_id}::uuid OR target_role = ${req.user.role})
        AND is_read = false
    `;
    return res.json({ success: true, message: "All notifications marked as read" });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// PATCH /api/erp/notifications/:id/action
export async function actionNotification(req, res) {
  try {
    await prisma.$executeRaw`
      UPDATE notifications SET is_actioned = true, actioned_at = NOW(),
        actioned_by = ${req.user.user_id}::uuid, is_read = true
      WHERE notif_id = ${req.params.id}::uuid
    `;
    await writeAudit({
      ...auditUser(req),
      action: "ACTION",
      tableName: "notifications",
      recordId: req.params.id,
    });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/erp/notifications/unread-count
export async function getUnreadCount(req, res) {
  try {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM notifications
      WHERE (target_user_id = ${req.user.user_id}::uuid OR target_role = ${req.user.role})
        AND is_read = false
    `;
    return res.json({ success: true, count: Number(rows[0].cnt) });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/erp/notifications/admin/all
export async function getAllNotificationsAdmin(req, res) {
  try {
    const { notif_type, is_actioned, limit = 100, offset = 0 } = req.query;
    const data = await prisma.$queryRaw`
      SELECT n.*, u.full_name AS target_user_name
      FROM notifications n
      LEFT JOIN users u ON u.user_id = n.target_user_id
      WHERE (${notif_type || null}::text IS NULL OR n.notif_type = ${notif_type || null})
        AND (${is_actioned !== undefined ? (is_actioned === "true") : null}::boolean IS NULL
             OR n.is_actioned = ${is_actioned === "true"})
      ORDER BY n.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

// GET /api/erp/notifications/delivery-log
export async function getDeliveryLog(req, res) {
  try {
    const { notif_id, limit = 50, offset = 0 } = req.query;
    const data = await prisma.$queryRaw`
      SELECT ndl.*, n.title, n.notif_type
      FROM notification_delivery_log ndl
      JOIN notifications n ON n.notif_id = ndl.notif_id
      WHERE (${notif_id || null}::uuid IS NULL OR ndl.notif_id = ${notif_id || null}::uuid)
      ORDER BY ndl.sent_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `;
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

export { authenticate, authorize };
