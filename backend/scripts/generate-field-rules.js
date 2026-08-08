// CLI-only draft generator — never imported by the live app. Walks the
// live Prisma DMMF and produces a draft field-normalization-rules module
// for human review. Re-running after a schema change re-emits every
// already-classified field's rule unchanged (it re-derives the same
// deterministic heuristic every time) and simply adds new fields at the
// bottom of their model's block with a `// REVIEW:` marker — it never
// silently drops or overwrites a field that was already in the committed
// registry, because it doesn't read the committed file at all; a human
// diffs the new draft against the committed file and merges by hand.
//
// Usage: node backend/scripts/generate-field-rules.js > backend/scripts/field-rules.draft.js

import { Prisma } from '@prisma/client'
import { SECRET_FIELD_RE as SECRET_NAME_RE } from '../src/config/secret-field-patterns.js'

const EMAIL_NAME_RE = /email/i
const USERNAME_NAME_RE = /^username$/i
const PHONE_NAME_RE = /phone|mobile/i
const CODE_NAME_RE = /code$|Code$|gstin|pan$|sku$|invoicePrefix|invoiceNo|invoiceNumber|vehicleNo|lotNo|batchId|batchCode|batchNo|planId|soId|taskId|sendId|diNo|diNumber|itemCode|productCode/i
const FREE_TEXT_NAME_RE = /name$|Name$|address|remarks|notes|description|desc$|instruction/i
// Fixed-vocabulary/dropdown-driven fields this codebase compares against
// UPPERCASE literals (=== 'PENDING', === 'PACK', etc.) — per explicit user
// confirmation, these get NO case change, not lowercase, despite reading
// as "enum-like".
const ENUM_LIKE_NAME_RE = /status$|type$|category$|state$|mode$|stage$|priority$|flag$|role$|section$|tracking/i

function isSystemGeneratedId(field) {
  if (!field.isId || !field.hasDefaultValue) return false
  const defName = field.default?.name
  return defName === 'cuid' || defName === 'uuid' || defName === 'dbgenerated' || defName === 'autoincrement'
}

function classify(fieldName) {
  if (SECRET_NAME_RE.test(fieldName)) return { rule: 'EXCLUDE', reason: 'secret/credential' }
  if (EMAIL_NAME_RE.test(fieldName)) return { rule: 'LOWER', reason: 'email' }
  if (USERNAME_NAME_RE.test(fieldName)) return { rule: 'LOWER', reason: 'username' }
  if (PHONE_NAME_RE.test(fieldName)) return { rule: 'PHONE', reason: 'phone number' }
  if (ENUM_LIKE_NAME_RE.test(fieldName)) return { rule: 'NONE', reason: 'fixed-vocabulary/enum-like — compared against UPPERCASE literals elsewhere, must not change case', review: true }
  if (CODE_NAME_RE.test(fieldName)) return { rule: 'UPPER', reason: 'business code/identifier' }
  if (FREE_TEXT_NAME_RE.test(fieldName)) return { rule: 'NONE', reason: 'business name/free text — never case-changed' }
  return { rule: 'NONE', reason: 'no confident naming signal — safe default, review', review: true }
}

function main() {
  const models = Prisma.dmmf.datamodel.models
  const lines = []
  lines.push("// AUTO-GENERATED DRAFT — see backend/scripts/generate-field-rules.js")
  lines.push("// Review every `// REVIEW:` line, then merge into backend/src/config/field-normalization-rules.js")
  lines.push("")

  for (const model of models) {
    const relationFkNames = new Set(
      model.fields.filter((f) => f.kind === 'object').flatMap((f) => f.relationFromFields || [])
    )
    const stringFields = model.fields.filter((f) => f.kind === 'scalar' && f.type === 'String')
    const entries = []

    for (const f of stringFields) {
      if (isSystemGeneratedId(f)) continue // system-generated PK, never text
      if (relationFkNames.has(f.name)) continue // FK scalar, never text
      const { rule, reason, review } = classify(f.name)
      if (rule === 'EXCLUDE') continue
      entries.push({ name: f.name, rule, reason, review, isId: f.isId, isUnique: f.isUnique })
    }

    if (!entries.length) continue
    lines.push(`  ${model.name}: {`)
    for (const e of entries) {
      const marker = e.review ? ' // REVIEW: ' : ' // '
      const flags = [e.isId && 'PK', e.isUnique && 'UNIQUE'].filter(Boolean).join(',')
      lines.push(`    ${e.name}: RULES.${e.rule},${marker}${e.reason}${flags ? ` [${flags}]` : ''}`)
    }
    lines.push(`  },`)
  }

  console.log("import { RULES } from '../src/utils/text-normalize.js'\n")
  console.log("export const FIELD_RULES = {")
  console.log(lines.slice(3).join('\n'))
  console.log("}")
}

main()
