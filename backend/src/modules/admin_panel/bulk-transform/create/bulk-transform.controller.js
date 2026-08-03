import prisma from '../../../../db.js'
import { auditUser } from '../../../../middleware/audit.js'
import { validateBulkTransformRequest } from '../bulk-transform.util.js'
import { runBulkTransform } from '../services/transform-execution.service.js'

// Creates the job row, responds immediately (202), then runs the transform
// as a background transaction — same fire-and-forget pattern as
// createDelete/runDeleteExecution, so the request never blocks on
// potentially thousands of row updates.
export const createTransform = async (req, res) => {
  const v = validateBulkTransformRequest(req.body)
  if (v.error) return res.status(v.status).json({ success: false, error: v.error, code: v.code })
  const { meta } = v
  const { resource, ids, columns, transformType, params } = req.body

  // AuditLog.userId is a @db.Uuid column but this app's user identity is
  // always an email string — deliberately omitted, same fix already used by
  // backup.controller.js for the same constraint.
  const { username, ip } = auditUser(req)

  const job = await prisma.transformJob.create({
    data: {
      resource,
      tableName: meta.model,
      columns,
      transformType,
      params: params || undefined,
      targetIds: ids,
      recordsTotal: ids.length,
      startedBy: username,
      startedByName: req.user?.full_name || username,
    },
  })

  res.status(202).json({ success: true, data: { id: job.id } })

  runBulkTransform(job.id, { meta, resource, ids, columns, transformType, params, auditCtx: { username, ip } }).catch((err) => {
    console.error('[BULK TRANSFORM EXECUTION ERROR]', err)
  })
}
