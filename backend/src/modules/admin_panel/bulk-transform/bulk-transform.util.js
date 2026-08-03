import { getMeta } from '../get/admin_panel.controller.js'
import { getTransform } from '../../../utils/text-transforms.js'

// `ids` are PK-value objects — [{ itemCode: 'X' }] for a simple key, or
// [{ itemCode: 'X', year: 2026 }] for a composite one — the exact same
// shape the frontend's recordIdsFor() already produces for delete flows.

export function buildBulkWhere(meta, ids) {
  if (Array.isArray(meta.idField)) {
    return {
      OR: ids.map((idObj) => ({
        AND: meta.idField.map((f) => ({ [f]: f === 'year' ? Number(idObj[f]) : idObj[f] })),
      })),
    }
  }
  const coerce = (v) => (meta.idType === 'bigint' ? BigInt(v) : meta.idType === 'int' ? parseInt(v) : v)
  return { [meta.idField]: { in: ids.map((idObj) => coerce(idObj[meta.idField])) } }
}

// Single-row where, built from an already-fetched record — mirrors the
// existing buildWhere() in get/admin_panel.controller.js (same f1_f2
// compound-key naming convention Prisma generates for `@@id([f1,f2])`).
export function buildSingleWhere(meta, row) {
  if (Array.isArray(meta.idField)) {
    const [f1, f2] = meta.idField
    return { [`${f1}_${f2}`]: { [f1]: row[f1], [f2]: row[f2] } }
  }
  return { [meta.idField]: row[meta.idField] }
}

export function idDisplay(meta, row) {
  return Array.isArray(meta.idField) ? meta.idField.map((f) => row[f]).join('-') : row[meta.idField]
}

export function isProtectedColumn(meta, column) {
  return Array.isArray(meta.idField) ? meta.idField.includes(column) : meta.idField === column
}

// Shared by preview and create — a request that fails preview validation
// must fail create validation identically, and vice versa. Returns either
// { error, code, status } or { meta, transform }.
export function validateBulkTransformRequest(body) {
  const { resource, ids, columns, transformType, params } = body || {}

  const meta = getMeta(resource)
  if (!meta) return { error: 'Unknown resource', code: 'NOT_FOUND', status: 404 }

  const transform = getTransform(transformType)
  if (!transform) return { error: `Unknown transform type "${transformType}"`, code: 'VALIDATION_ERROR', status: 400 }

  if (!Array.isArray(ids) || ids.length === 0)
    return { error: 'At least one record must be selected', code: 'VALIDATION_ERROR', status: 400 }

  if (!Array.isArray(columns) || columns.length === 0)
    return { error: 'At least one target column must be selected', code: 'VALIDATION_ERROR', status: 400 }

  const protectedCols = columns.filter((c) => isProtectedColumn(meta, c))
  if (protectedCols.length)
    return { error: `Cannot transform primary key column(s): ${protectedCols.join(', ')}`, code: 'VALIDATION_ERROR', status: 400 }

  if (transform.requiresParams) {
    const missing = (transform.requiredParamFields || []).filter((f) => !params?.[f])
    if (missing.length)
      return { error: `${transform.label} requires: ${missing.join(', ')}`, code: 'VALIDATION_ERROR', status: 400 }
  }

  return { meta, transform }
}
