// DMMF-driven field allowlisting + secret-field redaction for the generic
// admin CRUD API (backend/src/modules/admin_panel/{create,update,delete,get}).
// Reused across all four handlers so no read/write path can forget it —
// before this, createRecord/updateRecord passed req.body to Prisma verbatim
// with zero allowlist across all 116 MODELS entries (including User), and
// listRecords/getRecord returned every column with no redaction (including
// User.passwordHash/pinHash).
import { Prisma } from '@prisma/client'
import { SECRET_FIELD_RE } from '../../../config/secret-field-patterns.js'

const modelByName = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]))

function dmmfModel(meta) {
  const name = meta.model.charAt(0).toUpperCase() + meta.model.slice(1)
  return modelByName.get(name)
}

// Fields the generic form is allowed to send. admin_panel's DataFormModal.jsx
// only ever sends flat scalar column names (never nested relation objects),
// so restricting to kind === 'scalar' is safe and matches the existing form.
export function getWritableFields(meta, { isUpdate }) {
  const model = dmmfModel(meta)
  if (!model) return new Set()
  return new Set(
    model.fields
      .filter((f) => f.kind === 'scalar')
      .filter((f) => !f.isGenerated && !f.isUpdatedAt) // system-managed
      .filter((f) => !SECRET_FIELD_RE.test(f.name)) // never client-writable via the generic API
      .filter((f) => !(isUpdate && f.isId)) // PK immutable on update; business-assigned PKs (e.g. RmMaster.itemCode) still allowed on create
      .map((f) => f.name),
  )
}

export function sanitizeWriteBody(meta, body, { isUpdate }) {
  const allowed = getWritableFields(meta, { isUpdate })
  const data = {}
  const rejectedKeys = []
  for (const [k, v] of Object.entries(body || {})) {
    if (allowed.has(k)) data[k] = v
    else rejectedKeys.push(k)
  }
  return { data, rejectedKeys }
}

// Strips secret-named scalar fields from any outgoing record(s) — applied
// to list/get responses AND create/update responses (a create/update on
// `users` would otherwise echo passwordHash straight back in the HTTP
// response even with the write-side allowlist above, since that only
// governs what's accepted, not what Prisma returns).
export function redactSecretFields(meta, recordOrArray) {
  const model = dmmfModel(meta)
  if (!model || recordOrArray == null) return recordOrArray
  const secretKeys = model.fields.filter((f) => SECRET_FIELD_RE.test(f.name)).map((f) => f.name)
  if (!secretKeys.length) return recordOrArray
  const strip = (row) => {
    const out = { ...row }
    for (const k of secretKeys) delete out[k]
    return out
  }
  return Array.isArray(recordOrArray) ? recordOrArray.map(strip) : strip(recordOrArray)
}

// Human-readable record identifier for audit logging — mirrors the
// idDisplay() convention already established in bulk-transform.util.js.
export function idDisplay(meta, row) {
  return Array.isArray(meta.idField) ? meta.idField.map((f) => row[f]).join('-') : row[meta.idField]
}
