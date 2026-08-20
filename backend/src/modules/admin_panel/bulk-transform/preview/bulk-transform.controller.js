import prisma from '../../../../db.js'
import { buildBulkWhere, getUniqueColumns, idDisplay, validateBulkTransformRequest } from '../bulk-transform.util.js'
import { toSafeErrorMessage } from '../../../../utils/safe-error.js';

const PREVIEW_SAMPLE_LIMIT = 50
const CONFLICT_SAMPLE_LIMIT = 20

// Only ever reads — computes what WOULD change without writing anything, so
// the admin can review before committing to /bulk-transform (create/apply).
export const previewTransform = async (req, res) => {
  const v = validateBulkTransformRequest(req.body)
  if (v.error) return res.status(v.status).json({ success: false, error: v.error, code: v.code })
  const { meta, transform } = v
  const { ids, columns, params } = req.body

  try {
    const rows = await prisma[meta.model].findMany({ where: buildBulkWhere(meta, ids) })
    const sample = []
    let changedCount = 0
    let skippedCount = 0
    let recordsToUpdate = 0

    // For any selected column backed by a single-field @unique constraint,
    // track what every selected row's value will end up as (post-transform
    // if it changes, as-is if it doesn't) so we can catch two rows landing
    // on the same value BEFORE starting a job that's guaranteed to fail
    // partway through and roll back.
    const uniqueColumns = getUniqueColumns(meta)
    const finalValuesByColumn = {}
    for (const col of columns) {
      if (uniqueColumns.has(col)) finalValuesByColumn[col] = new Map()
    }

    for (const row of rows) {
      let rowChanged = false
      for (const col of columns) {
        const value = row[col]
        // Only string values are ever eligible — this is the authoritative
        // "is this actually a text field" check (ground truth from the live
        // row, not a hand-maintained type list that could drift), and it
        // naturally excludes numbers/booleans/Dates/arrays/null.
        if (typeof value !== 'string') { skippedCount++; continue }
        const newValue = transform.apply(value, params)
        const changed = newValue !== value
        if (changed) {
          changedCount++
          rowChanged = true
          if (sample.length < PREVIEW_SAMPLE_LIMIT) {
            sample.push({ id: idDisplay(meta, row), column: col, oldValue: value, newValue })
          }
        }
        const bucket = finalValuesByColumn[col]
        if (bucket) {
          const finalValue = changed ? newValue : value
          if (!bucket.has(finalValue)) bucket.set(finalValue, [])
          bucket.get(finalValue).push(idDisplay(meta, row))
        }
      }
      if (rowChanged) recordsToUpdate++
    }

    const uniqueConflicts = []
    for (const [column, bucket] of Object.entries(finalValuesByColumn)) {
      for (const [value, rowIds] of bucket) {
        if (rowIds.length > 1) uniqueConflicts.push({ column, value, count: rowIds.length, ids: rowIds.slice(0, 10) })
        if (uniqueConflicts.length >= CONFLICT_SAMPLE_LIMIT) break
      }
      if (uniqueConflicts.length >= CONFLICT_SAMPLE_LIMIT) break
    }

    return res.json({
      success: true,
      data: {
        recordsMatched: rows.length,
        // Distinct rows that will actually be written — not the same as
        // recordsMatched, since rows already in the target form are skipped
        // by runBulkTransform (see its `Object.keys(data).length > 0` guard).
        recordsToUpdate,
        changedCount,
        skippedCount,
        sample,
        sampleCapped: changedCount > sample.length,
        // Rows within THIS selection that would end up sharing a value on a
        // unique column — applying is guaranteed to fail and roll back until
        // this is resolved. Doesn't catch collisions against an unselected
        // existing row; the apply-time error message is the backstop there.
        uniqueConflicts,
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: toSafeErrorMessage(err), code: 'INTERNAL_ERROR' })
  }
}
