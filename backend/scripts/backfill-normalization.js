// CLI-only, one-time historical-data backfill. Applies FIELD_RULES to every
// existing row so historical data matches the text-storage standard going
// forward (new writes are already covered by the Client Extension in
// config/db.js — this script is only for data written before that existed).
//
// Reuses the diff-only-update / batched / audited pattern from
// backend/src/modules/admin_panel/bulk-transform/services/transform-execution.service.js.
//
// Usage:
//   node backend/scripts/backfill-normalization.js --dry-run   (report only, zero writes)
//   node backend/scripts/backfill-normalization.js             (real run)

import 'dotenv/config'
import { Prisma } from '@prisma/client'
import prisma from '../config/db.js'
import { FIELD_RULES } from '../src/config/field-normalization-rules.js'
import { applyRule } from '../src/utils/text-normalize.js'
import { writeAudit } from '../src/middleware/audit.js'

const DRY_RUN = process.argv.includes('--dry-run')
const BATCH_SIZE = 200

const modelByName = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m]))

function getPkFields(modelName) {
  const model = modelByName.get(modelName)
  if (model.primaryKey) return model.primaryKey.fields
  const idField = model.fields.find((f) => f.isId)
  return idField ? [idField.name] : []
}

function buildWhereForPk(pkFields, row) {
  if (pkFields.length === 1) return { [pkFields[0]]: row[pkFields[0]] }
  const compoundName = pkFields.join('_')
  return { [compoundName]: Object.fromEntries(pkFields.map((f) => [f, row[f]])) }
}

function getUniqueStringFields(modelName) {
  const model = modelByName.get(modelName)
  return new Set(
    model.fields.filter((f) => f.kind === 'scalar' && f.type === 'String' && f.isUnique).map((f) => f.name)
  )
}

async function backfillModel(modelName, rules) {
  const accessor = modelName.charAt(0).toLowerCase() + modelName.slice(1)
  const pkFields = getPkFields(modelName)
  const report = { model: modelName, totalRows: 0, rowsChanged: 0, fieldsChanged: {}, collisions: [] }

  if (!pkFields.length) {
    report.skipped = 'no resolvable primary key'
    return report
  }

  const uniqueFields = getUniqueStringFields(modelName)
  const orderBy = pkFields.map((f) => ({ [f]: 'asc' }))

  let skip = 0
  while (true) {
    const rows = await prisma[accessor].findMany({ skip, take: BATCH_SIZE, orderBy })
    if (!rows.length) break

    for (const row of rows) {
      report.totalRows++
      const data = {}
      for (const [field, rule] of Object.entries(rules)) {
        const current = row[field]
        if (typeof current !== 'string') continue
        const next = applyRule(rule, current)
        if (next !== current) data[field] = next
      }
      if (Object.keys(data).length === 0) continue

      // Collision pre-check: changing a unique column to a value another
      // row already has (case/whitespace-insensitively) would fail with
      // P2002 — detect and skip just that field, reporting it instead of
      // crashing the whole run.
      for (const col of Object.keys(data)) {
        if (!uniqueFields.has(col)) continue
        // eslint-disable-next-line no-await-in-loop
        const clash = await prisma[accessor].findFirst({
          where: { [col]: { equals: data[col], mode: 'insensitive' }, NOT: buildWhereForPk(pkFields, row) },
        })
        if (clash) {
          report.collisions.push({
            row: buildWhereForPk(pkFields, row),
            field: col,
            newValue: data[col],
            clashesWith: buildWhereForPk(pkFields, clash),
          })
          delete data[col]
        }
      }
      if (Object.keys(data).length === 0) continue

      for (const f of Object.keys(data)) report.fieldsChanged[f] = (report.fieldsChanged[f] || 0) + 1
      report.rowsChanged++

      if (!DRY_RUN) {
        // eslint-disable-next-line no-await-in-loop
        await prisma[accessor].update({ where: buildWhereForPk(pkFields, row), data })
      }
    }
    skip += BATCH_SIZE
  }
  return report
}

async function main() {
  console.log(`=== ${DRY_RUN ? 'DRY RUN' : 'REAL RUN'} — backfilling ${Object.keys(FIELD_RULES).length} models ===\n`)
  const reports = []
  for (const [modelName, rules] of Object.entries(FIELD_RULES)) {
    // eslint-disable-next-line no-await-in-loop
    const r = await backfillModel(modelName, rules)
    reports.push(r)
    if (r.skipped) {
      console.log(`  SKIP  ${modelName} — ${r.skipped}`)
    } else if (r.rowsChanged || r.collisions.length) {
      const collisionNote = r.collisions.length ? ` — ${r.collisions.length} COLLISION(S)` : ''
      console.log(`  ${r.rowsChanged > 0 ? 'CHANGE' : 'OK    '}  ${modelName}: ${r.rowsChanged}/${r.totalRows} row(s) changed${collisionNote}`)
    }
  }

  const totalChanged = reports.reduce((s, r) => s + (r.rowsChanged || 0), 0)
  const totalRows = reports.reduce((s, r) => s + (r.totalRows || 0), 0)
  const totalCollisions = reports.reduce((s, r) => s + (r.collisions?.length || 0), 0)

  console.log(`\n=== ${DRY_RUN ? 'DRY RUN' : 'REAL RUN'} complete: ${totalChanged} row(s) ${DRY_RUN ? 'would be' : 'were'} changed out of ${totalRows} scanned, ${totalCollisions} collision(s) ===`)

  if (totalCollisions) {
    console.log('\nCOLLISIONS (field left untouched, needs manual resolution):')
    for (const r of reports) {
      if (r.collisions.length) console.log(JSON.stringify({ model: r.model, collisions: r.collisions }, null, 2))
    }
  }

  if (!DRY_RUN) {
    await writeAudit({
      username: 'system:normalization-rollout',
      action: 'BULK_TRANSFORM',
      tableName: 'multiple',
      recordId: `${reports.length} model(s), ${totalChanged} row(s)`,
      newValue: reports.map((r) => ({ model: r.model, rowsChanged: r.rowsChanged, fieldsChanged: r.fieldsChanged })),
      notes: 'One-time historical-data normalization backfill (text-storage standard rollout).',
    })
  }

  await prisma.$disconnect()
  process.exit(totalCollisions > 0 ? 2 : 0)
}

main().catch(async (err) => {
  console.error('BACKFILL SCRIPT CRASHED:', err)
  await prisma.$disconnect()
  process.exit(1)
})
