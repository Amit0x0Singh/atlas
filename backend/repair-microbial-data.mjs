// One-time repair for MicrobeMaster rows created before the field-
// normalization rule for this model was in effect — microbeCode should
// always be UPPERCASE (containers/inward rows already enforce this), but
// some older master rows were left lowercase (e.g. "mc00059"). Because the
// "New Inward Entry" form's existing-container lookup does an exact
// microbeCode match against MicrobialSfgContainer (always uppercase), a
// lowercase master row makes that lookup find nothing — the form then
// claims "no existing containers" and offers to create one that actually
// already exists, which fails outright once submitted (unique constraint
// on containerCode).
//
// Safe to run more than once — only touches rows that still differ from
// their normalized form. Each row is updated individually with a
// try/catch, so if any single row happens to collide with another after
// uppercasing (would only happen if two master rows already differed only
// by case, e.g. "mc1" and "MC1" both existing), that one row is reported
// and skipped rather than aborting the whole run.
//
// USAGE (from the backend/ directory on the server):
//   node repair-microbe-master-casing.mjs
// Then delete this file — it's a one-off, not part of the app.

import prisma from './src/db.js'
import { applyRule, RULES } from './src/utils/text-normalize.js'

async function main() {
  console.log('=== Normalizing MicrobeMaster casing ===')
  const microbes = await prisma.microbeMaster.findMany()
  let fixed = 0
  let failed = 0

  for (const m of microbes) {
    const data = {}
    if (m.microbeCode) {
      const up = applyRule(RULES.UPPER, m.microbeCode)
      if (up !== m.microbeCode) data.microbeCode = up
    }
    if (m.microbeName) {
      const low = applyRule(RULES.LOWER, m.microbeName)
      if (low !== m.microbeName) data.microbeName = low
    }
    if (m.uom) {
      const low = applyRule(RULES.LOWER, m.uom)
      if (low !== m.uom) data.uom = low
    }
    if (Object.keys(data).length === 0) continue

    try {
      await prisma.microbeMaster.update({ where: { microbeId: m.microbeId }, data })
      fixed++
      console.log(`  ${m.microbeCode} (${m.microbeId}):`, data)
    } catch (e) {
      failed++
      console.error(`  FAILED for ${m.microbeCode} (${m.microbeId}):`, e.message)
    }
  }

  console.log(`\nDone — ${fixed} microbe master row(s) normalized${failed ? `, ${failed} failed (see above)` : ''}.`)
}

main()
  .catch((e) => { console.error('REPAIR FAILED:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())

// cd /var/www/SOM_ERP/backend
// node repair-microbe-master-casing.mjs