import prisma from '../../../../db.js'
import { buildBulkWhere, idDisplay, validateBulkTransformRequest } from '../bulk-transform.util.js'

const PREVIEW_SAMPLE_LIMIT = 50

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
        if (newValue === value) continue
        changedCount++
        rowChanged = true
        if (sample.length < PREVIEW_SAMPLE_LIMIT) {
          sample.push({ id: idDisplay(meta, row), column: col, oldValue: value, newValue })
        }
      }
      if (rowChanged) recordsToUpdate++
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
      },
    })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL_ERROR' })
  }
}
