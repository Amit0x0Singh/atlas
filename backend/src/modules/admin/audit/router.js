/**
 * Thin HTTP surface over audit-log.service.js — mirrors modules/admin/rbac/router.js.
 * Read-only: nothing here can create/update/delete an AuditLog row (that
 * only ever happens via writeAudit(), called directly by the code performing
 * the audited action). Gated by admin.audit.view — a normal user does not
 * get this permission automatically.
 */
import express from 'express'
import { authorize } from '../../../middleware/auth.js'
import * as auditLog from '../../../services/audit-log.service.js'

const AuditRouter = express.Router()
const canView = authorize('admin.audit.view')

const wrap = (fn) => async (req, res) => {
  try {
    const result = await fn(req)
    return res.json({ success: true, data: result })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message, code: 'VALIDATION_ERROR' })
  }
}

AuditRouter.get('/', canView, async (req, res) => {
  const result = await auditLog.listAuditLogs(req.query)
  return res.json({ success: true, data: result.items, total: result.total, page: result.page, limit: result.limit })
})
AuditRouter.get('/meta', canView, wrap(() => auditLog.listAuditLogFilterMeta()))
AuditRouter.get('/:id', canView, wrap((req) => auditLog.getAuditLog(req.params.id)))

export default AuditRouter
