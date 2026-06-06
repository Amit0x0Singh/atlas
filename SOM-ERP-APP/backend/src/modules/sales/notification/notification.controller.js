/**
 * Notifications Routes — /api/erp/notifications/*
 */
import prisma from '../db.js'
import { authenticate, authorize } from '../middleware/auth.js'
import { writeAudit, auditUser } from '../middleware/audit.js'

export default async function erpNotificationsRoutes(fastify) {

  // ─── GET /api/erp/notifications — my notifications ────────────────────────
  fastify.get('/', { preHandler: authenticate }, async (req) => {
    const { unread_only, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT n.*
      FROM notifications n
      WHERE (n.target_user_id = ${req.user.user_id}::uuid
             OR n.target_role = ${req.user.role})
        AND (${unread_only === 'true' ? true : null}::boolean IS NULL OR n.is_read = false)
      ORDER BY n.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    const unreadCount = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM notifications
      WHERE (target_user_id = ${req.user.user_id}::uuid OR target_role = ${req.user.role})
        AND is_read = false
    `
    return { success: true, data, unread_count: Number(unreadCount[0].cnt) }
  })

  // ─── PATCH /:id/read ──────────────────────────────────────────────────────
  fastify.patch('/:id/read', { preHandler: authenticate }, async (req) => {
    await prisma.$executeRaw`
      UPDATE notifications SET is_read = true WHERE notif_id = ${req.params.id}::uuid
    `
    return { success: true }
  })

  // ─── PATCH /read-all ──────────────────────────────────────────────────────
  fastify.patch('/read-all', { preHandler: authenticate }, async (req) => {
    await prisma.$executeRaw`
      UPDATE notifications SET is_read = true
      WHERE (target_user_id = ${req.user.user_id}::uuid OR target_role = ${req.user.role})
        AND is_read = false
    `
    return { success: true, message: 'All notifications marked as read' }
  })

  // ─── PATCH /:id/action ────────────────────────────────────────────────────
  fastify.patch('/:id/action', { preHandler: authenticate }, async (req) => {
    await prisma.$executeRaw`
      UPDATE notifications SET is_actioned = true, actioned_at = NOW(),
        actioned_by = ${req.user.user_id}::uuid, is_read = true
      WHERE notif_id = ${req.params.id}::uuid
    `
    await writeAudit({ ...auditUser(req), action: 'ACTION', tableName: 'notifications', recordId: req.params.id })
    return { success: true }
  })

  // ─── GET /unread-count — quick badge count ────────────────────────────────
  fastify.get('/unread-count', { preHandler: authenticate }, async (req) => {
    const rows = await prisma.$queryRaw`
      SELECT COUNT(*) AS cnt FROM notifications
      WHERE (target_user_id = ${req.user.user_id}::uuid OR target_role = ${req.user.role})
        AND is_read = false
    `
    return { success: true, count: Number(rows[0].cnt) }
  })

  // ─── GET /admin/all — admin view all ─────────────────────────────────────
  fastify.get('/admin/all', { preHandler: authorize(['admin']) }, async (req) => {
    const { notif_type, is_actioned, limit = 100, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT n.*, u.full_name AS target_user_name
      FROM notifications n
      LEFT JOIN users u ON u.user_id = n.target_user_id
      WHERE (${notif_type || null}::text IS NULL OR n.notif_type = ${notif_type || null})
        AND (${is_actioned !== undefined ? (is_actioned === 'true') : null}::boolean IS NULL
             OR n.is_actioned = ${is_actioned === 'true'})
      ORDER BY n.created_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return { success: true, data }
  })

  // ─── GET /delivery-log — check delivery status ────────────────────────────
  fastify.get('/delivery-log', { preHandler: authorize(['admin', 'store_manager']) }, async (req) => {
    const { notif_id, limit = 50, offset = 0 } = req.query
    const data = await prisma.$queryRaw`
      SELECT ndl.*, n.title, n.notif_type
      FROM notification_delivery_log ndl
      JOIN notifications n ON n.notif_id = ndl.notif_id
      WHERE (${notif_id || null}::uuid IS NULL OR ndl.notif_id = ${notif_id || null}::uuid)
      ORDER BY ndl.sent_at DESC
      LIMIT ${Number(limit)} OFFSET ${Number(offset)}
    `
    return { success: true, data }
  })
}
