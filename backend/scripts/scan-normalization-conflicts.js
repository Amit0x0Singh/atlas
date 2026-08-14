// CLI-only, read-only pre-flight scan. Finds every single-field @unique and
// composite @@unique constraint that involves at least one String column,
// then checks whether any TWO existing rows would collapse to the same
// value under case+whitespace-insensitive comparison
// (lower(regexp_replace(trim(col), '\s+', ' ', 'g'))) — the same expression
// the functional unique indexes in step 6b use. Any non-empty result means
// that column/composite cannot get its functional index yet; a human must
// resolve the conflict (merge/rename) first. Never writes anything.
//
// Usage: node backend/scripts/scan-normalization-conflicts.js

import 'dotenv/config'
import { Prisma } from '@prisma/client'
import prisma from '../config/db.js'

function normExpr(dbColumn) {
  return `lower(regexp_replace(trim("${dbColumn}"), '\\s+', ' ', 'g'))`
}

function buildTargets() {
  const targets = []
  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName || model.name
    const stringFieldNames = new Set(
      model.fields.filter((f) => f.kind === 'scalar' && f.type === 'String').map((f) => f.name)
    )
    const dbNameOf = (fieldName) => model.fields.find((f) => f.name === fieldName)?.dbName || fieldName

    // Single-field @unique string columns.
    for (const f of model.fields) {
      if (f.kind === 'scalar' && f.type === 'String' && f.isUnique) {
        targets.push({ model: model.name, table, columns: [{ field: f.name, db: f.dbName || f.name }] })
      }
    }

    // Composite @@unique involving at least one String field.
    for (const idx of model.uniqueIndexes || []) {
      if (idx.fields.some((fname) => stringFieldNames.has(fname))) {
        targets.push({
          model: model.name,
          table,
          columns: idx.fields.map((fname) => ({ field: fname, db: dbNameOf(fname), isString: stringFieldNames.has(fname) })),
        })
      }
    }
  }
  return targets
}

async function scanTarget(t) {
  const selectExprs = t.columns.map((c, i) =>
    c.isString === false ? `"${c.db}" AS c${i}` : `${normExpr(c.db)} AS c${i}`
  )
  const groupBy = t.columns.map((_, i) => `c${i}`).join(', ')
  const sql = `
    SELECT ${selectExprs.join(', ')}, count(*) AS n
    FROM "${t.table}"
    WHERE ${t.columns.map((c) => `"${c.db}" IS NOT NULL`).join(' AND ')}
    GROUP BY ${groupBy}
    HAVING count(*) > 1
    ORDER BY n DESC
  `
  try {
    const rows = await prisma.$queryRawUnsafe(sql)
    return rows.map((r) => {
      const out = { n: Number(r.n) }
      t.columns.forEach((c, i) => { out[c.field] = r[`c${i}`] })
      return out
    })
  } catch (err) {
    return [{ error: err.message }]
  }
}

async function main() {
  const targets = buildTargets()
  console.log(`Scanning ${targets.length} unique constraint(s) across the schema...\n`)

  let anyConflicts = false
  for (const t of targets) {
    const label = `${t.model}.${t.columns.map((c) => c.field).join('+')}`
    const conflicts = await scanTarget(t)
    if (conflicts.length === 0) {
      console.log(`  OK    ${label}`)
    } else if (conflicts[0]?.error) {
      console.log(`  ERROR ${label} — ${conflicts[0].error}`)
    } else {
      anyConflicts = true
      console.log(`  CONFLICT  ${label} — ${conflicts.length} colliding group(s):`)
      for (const c of conflicts.slice(0, 10)) {
        console.log(`      ${JSON.stringify(c)}`)
      }
      if (conflicts.length > 10) console.log(`      ...and ${conflicts.length - 10} more`)
    }
  }

  console.log(anyConflicts
    ? '\n=== CONFLICTS FOUND — resolve before creating functional indexes for the flagged columns ==='
    : '\n=== NO CONFLICTS — safe to proceed with functional index creation for all scanned columns ===')

  await prisma.$disconnect()
  process.exit(anyConflicts ? 1 : 0)
}

main().catch(async (err) => {
  console.error('SCAN SCRIPT CRASHED:', err)
  await prisma.$disconnect()
  process.exit(1)
})
