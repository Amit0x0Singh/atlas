// CLI-only, read-only pre-flight scan — the file-based counterpart to
// scan-normalization-conflicts.js (which scans the LIVE database). This one
// scans a .json.gz/.xlsx BACKUP FILE before it's ever restored, against the
// same case+whitespace-insensitive functional unique indexes added by
// migrations/20260804125421_ci_unique_indexes, plus every plain Prisma
// @unique/@@unique string constraint — so every column a restore's
// createMany() could reject on a unique-constraint violation is checked in
// one pass, instead of discovering them one at a time through repeated
// failed restores (each of which rolls back the *entire* transaction).
//
// Usage: node backend/scripts/scan-backup-file-conflicts.js <path-to-backup-file>

import path from 'path'
import { Prisma } from '@prisma/client'
import { validateBackupFile } from '../src/modules/backup/services/backup-restore.service.js'

function normKey(value) {
  if (value === null || value === undefined) return null
  return String(value).trim().replace(/\s+/g, ' ').toLowerCase()
}

// Mirrors scan-normalization-conflicts.js's buildTargets() — every
// single-field @unique and composite @@unique constraint involving at least
// one String column, DMMF-derived so it can never drift from the schema.
function buildTargets() {
  const targets = []
  for (const model of Prisma.dmmf.datamodel.models) {
    const accessor = model.name.charAt(0).toLowerCase() + model.name.slice(1)
    const stringFieldNames = new Set(
      model.fields.filter((f) => f.kind === 'scalar' && f.type === 'String').map((f) => f.name)
    )

    for (const f of model.fields) {
      if (f.kind === 'scalar' && f.type === 'String' && f.isUnique) {
        targets.push({ model: model.name, accessor, columns: [f.name] })
      }
    }

    for (const idx of model.uniqueIndexes || []) {
      if (idx.fields.some((fname) => stringFieldNames.has(fname))) {
        targets.push({ model: model.name, accessor, columns: idx.fields, isStringField: idx.fields.map((fname) => stringFieldNames.has(fname)) })
      }
    }
  }
  return targets
}

function scanTable(rows, columns, isStringField) {
  const groups = new Map()
  for (const row of rows) {
    const keyParts = columns.map((col, i) => {
      const v = row[col]
      const useNorm = isStringField ? isStringField[i] : true
      return useNorm ? normKey(v) : v
    })
    if (keyParts.some((k) => k === null)) continue // NULLs never conflict with each other in Postgres unique indexes
    const key = JSON.stringify(keyParts)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(row)
  }
  return [...groups.values()].filter((g) => g.length > 1)
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: node backend/scripts/scan-backup-file-conflicts.js <path-to-backup-file>')
    process.exit(1)
  }

  console.log(`\nLoading backup file: ${filePath}\n`)
  const { parsed, tables } = await validateBackupFile(path.resolve(process.cwd(), filePath))
  console.log(`Backup contains ${tables.length} restorable table(s). Scanning for unique-constraint conflicts...\n`)

  const targets = buildTargets().filter((t) => tables.includes(t.accessor))
  let anyConflicts = false

  for (const t of targets) {
    const rows = parsed.data[t.accessor] ?? []
    if (rows.length === 0) continue
    const label = `${t.model}.${t.columns.join('+')}`
    const conflicts = scanTable(rows, t.columns, t.isStringField)
    if (conflicts.length === 0) {
      console.log(`  OK        ${label} (${rows.length} rows)`)
    } else {
      anyConflicts = true
      console.log(`  CONFLICT  ${label} — ${conflicts.length} colliding group(s):`)
      for (const group of conflicts.slice(0, 15)) {
        const keyDesc = t.columns.map((c) => `${c}=${JSON.stringify(group[0][c])}`).join(', ')
        console.log(`      [${keyDesc}] — ${group.length} rows: ${group.map((r) => r.id ?? r.itemCode ?? r.equipCode ?? JSON.stringify(r).slice(0, 60)).join(' | ')}`)
      }
      if (conflicts.length > 15) console.log(`      ...and ${conflicts.length - 15} more group(s)`)
    }
  }

  console.log(anyConflicts
    ? '\n=== CONFLICTS FOUND — these will make restore fail on createMany() unless resolved first ==='
    : '\n=== NO CONFLICTS — this backup file should restore cleanly with respect to unique constraints ===')

  process.exit(anyConflicts ? 1 : 0)
}

main().catch((err) => {
  console.error('SCAN SCRIPT CRASHED:', err)
  process.exit(1)
})
