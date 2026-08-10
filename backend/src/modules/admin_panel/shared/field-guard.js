// DMMF-driven field allowlisting + secret-field redaction for the generic
// admin CRUD API (backend/src/modules/admin_panel/{create,update,delete,get}).
// Reused across all four handlers so no read/write path can forget it —
// before this, createRecord/updateRecord passed req.body to Prisma verbatim
// with zero allowlist across all 116 MODELS entries (including User), and
// listRecords/getRecord returned every column with no redaction (including
// User.passwordHash/pinHash).
import { Prisma } from '@prisma/client'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { SECRET_FIELD_RE } from '../../../config/secret-field-patterns.js'

const modelByName = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]))

export function dmmfModel(meta) {
  const name = meta.model.charAt(0).toUpperCase() + meta.model.slice(1)
  return modelByName.get(name)
}

// String-typed DMMF fields report `field.type === 'String'` regardless of
// their Postgres native type, and `Prisma.dmmf.datamodel` (the client-runtime
// DMMF) doesn't carry `@db.X` native-type annotations at all — there's no
// `field.nativeType` to check. But `@db.Uuid` columns get a `UuidFilter` at
// the query-builder level, which doesn't support `contains`/`mode`, so any
// such field pulled into a search OR-clause 500s (confirmed on
// GateInward.inwardId). `@db.Uuid` isn't limited to `@id` fields either —
// FK-ish columns like `qrConfirmedBy`/`approvedBy`/`gateInwardId` carry it
// too — so an isId-based heuristic would miss most of them.
// The one place native types survive intact is the generated
// node_modules/.prisma/client/schema.prisma, which is regenerated in
// lockstep with the client on every `prisma generate` — parse it once at
// startup instead of hand-maintaining a field list.
function loadUuidFieldSet() {
  const set = new Set()
  try {
    const require = createRequire(import.meta.url)
    const clientPkgDir = path.dirname(require.resolve('@prisma/client/package.json'))
    const nodeModulesDir = path.resolve(clientPkgDir, '../..')
    const schemaPath = path.join(nodeModulesDir, '.prisma/client/schema.prisma')
    const text = fs.readFileSync(schemaPath, 'utf8')
    const modelRe = /model\s+(\w+)\s*\{([\s\S]*?)\n\}/g
    let modelMatch
    while ((modelMatch = modelRe.exec(text))) {
      const [, modelName, body] = modelMatch
      const fieldRe = /^\s*(\w+)\s+\S[^\n]*@db\.Uuid/gm
      let fieldMatch
      while ((fieldMatch = fieldRe.exec(body))) {
        set.add(`${modelName}.${fieldMatch[1]}`)
      }
    }
  } catch {
    // If the generated schema can't be found/parsed, fail open on this
    // specific exclusion rather than crash startup — worst case a Uuid
    // column resurfaces in search and 500s, same as before this fix existed.
  }
  return set
}
const UUID_NATIVE_FIELDS = loadUuidFieldSet()

function supportsContains(modelName, field) {
  return !UUID_NATIVE_FIELDS.has(`${modelName}.${field.name}`)
}

// String scalar fields eligible for the generic keyword-search box — same
// DMMF + secret-exclusion approach as getWritableFields below, so a new
// password/token-shaped field is automatically kept out of search without
// needing a second registry to remember to update. List fields (e.g.
// ProductMaster.plant, a String[]) are excluded — Prisma's `contains` string
// filter isn't valid against an array column, that needs `has`/`hasSome`.
// Uuid-native columns are excluded for the same "contains isn't valid"
// reason (see supportsContains above).
export function getSearchableFields(meta) {
  const model = dmmfModel(meta)
  if (!model) return []
  return model.fields
    .filter((f) => f.kind === 'scalar' && f.type === 'String' && !f.isList && supportsContains(model.name, f))
    .filter((f) => !SECRET_FIELD_RE.test(f.name))
    .map((f) => f.name)
}

// Scalar field -> Prisma DMMF type ('String' | 'DateTime' | ...), used to
// decide how an incoming filter value should be matched. Returns undefined
// for anything not a plain non-list scalar column (relations, unknown
// fields, array fields, Uuid-native String columns) so callers can safely
// reject those instead of building an invalid `where`.
export function scalarFieldType(meta, fieldName) {
  const model = dmmfModel(meta)
  if (!model) return undefined
  const field = model.fields.find((f) => f.kind === 'scalar' && f.name === fieldName && !f.isList)
  if (!field) return undefined
  if (field.type === 'String' && !supportsContains(model.name, field)) return undefined
  return field.type
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
