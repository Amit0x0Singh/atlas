import prisma from '../../../../db.js'
import { writeAudit } from '../../../../middleware/audit.js'
import { getTransform } from '../../../../utils/text-transforms.js'
import { buildBulkWhere, buildSingleWhere } from '../bulk-transform.util.js'

const PROGRESS_UPDATE_EVERY = 25

// Runs the whole apply as one transaction — every row succeeds or the whole
// job rolls back, nothing partially applied. Rows are re-fetched inside the
// transaction (not reused from preview) so a row edited between preview and
// apply is transformed from its current value, not a stale one.
export async function runBulkTransform(jobId, { meta, resource, ids, columns, transformType, params, auditCtx }) {
  await prisma.transformJob.update({ where: { id: jobId }, data: { status: 'RUNNING' } })

  const transform = getTransform(transformType)
  // Each row is its own find + update inside the transaction (transform
  // output differs per row, so this can't collapse into one updateMany) —
  // scale the timeout with row count, same idea as delete-execution's fixed
  // budget for its multi-table loop.
  const timeout = Math.min(600_000, Math.max(120_000, ids.length * 50))

  let recordsDone = 0
  let fieldsUpdated = 0
  let skippedCount = 0

  try {
    await prisma.$transaction(
      async (tx) => {
        const rows = await tx[meta.model].findMany({ where: buildBulkWhere(meta, ids) })

        for (const row of rows) {
          const data = {}
          for (const col of columns) {
            const value = row[col]
            if (typeof value !== 'string') { skippedCount++; continue }
            const newValue = transform.apply(value, params)
            if (newValue !== value) data[col] = newValue
          }
          if (Object.keys(data).length > 0) {
            // eslint-disable-next-line no-await-in-loop
            await tx[meta.model].update({ where: buildSingleWhere(meta, row), data })
            fieldsUpdated += Object.keys(data).length
          }
          recordsDone++
          if (recordsDone % PROGRESS_UPDATE_EVERY === 0) {
            // Progress via the plain client (not `tx`) so a poller sees it
            // live mid-transaction — same pattern as delete-execution.
            // eslint-disable-next-line no-await-in-loop
            await prisma.transformJob.update({ where: { id: jobId }, data: { recordsDone, fieldsUpdated, skippedCount } })
          }
        }
      },
      { timeout, maxWait: 10_000 },
    )

    await prisma.transformJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', recordsDone, fieldsUpdated, skippedCount, completedAt: new Date() },
    })

    await writeAudit({
      ...auditCtx,
      action: 'BULK_TRANSFORM',
      tableName: meta.model,
      recordId: `${recordsDone} record(s)`,
      newValue: { resource, columns, transformType, params, fieldsUpdated, skippedCount },
      notes: `Bulk transform completed — ${transform?.label ?? transformType} on ${columns.join(', ')}: ${fieldsUpdated} field(s) updated across ${recordsDone} record(s), ${skippedCount} skipped (non-text value).`,
    })
  } catch (err) {
    // Transaction already rolled back automatically — nothing partially
    // written. P2002 (unique constraint) is the one failure mode expected
    // to actually happen in practice — the preview step already warns about
    // collisions within the selected batch, so a P2002 here almost always
    // means the new value collides with a record that wasn't selected;
    // translate it instead of surfacing Prisma's raw invocation dump.
    const message = err.code === 'P2002'
      ? `This would create a duplicate value in a unique field (${(err.meta?.target || []).join(', ') || 'unknown field'}). At least one new value already exists on another record. Nothing was changed — adjust your selection or transformation and try again.`
      : err.message
    await prisma.transformJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', errorMessage: message },
    })
    await writeAudit({
      ...auditCtx,
      action: 'BULK_TRANSFORM',
      tableName: meta.model,
      recordId: jobId,
      notes: `Bulk transform FAILED: ${message}`,
    })
  }
}
