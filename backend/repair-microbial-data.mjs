// one-time data repair for the microbial SFG module — fixes data created
// before two backend bugs were patched (now on origin/main):
//
//   1. Container numbering (seqNo) drifted out of sync with the actual
//      MicrobialSfgContainerSeq counter for any microbe/type pair whose
//      container was ever inserted outside the normal create-inward flow.
//   2. New batches (MicrobialSfgInward rows) were saved with no `location`
//      even though their container had one, because the old code read the
//      wrong field when writing the batch row.
//   3. `location`/`inactiveLocation` were being stored lowercase (a stale
//      field-normalization rule) instead of the uppercase rack-shelf-side-
//      position format the app generates and displays everywhere.
//
// Safe to run more than once — every step is idempotent (only touches rows
// that are actually still wrong).
//
// USAGE (run from the backend/ directory on the server, after `git pull`
// has brought in the code fixes and `npm install`/`prisma generate` if
// needed):
//
//   node repair-microbial-data.mjs
//
// Then delete this file — it's a one-off, not part of the app.

import prisma from './src/db.js'
import { applyRule, RULES } from './src/utils/text-normalize.js'

async function repairContainerSequencing() {
  console.log('\n=== Step 1/3: container sequence numbers ===')
  const containers = await prisma.microbialSfgContainer.findMany({
    orderBy: [{ microbeCode: 'asc' }, { typeCode: 'asc' }, { createdAt: 'asc' }],
  })
  const seqRows = await prisma.microbialSfgContainerSeq.findMany()
  const seqMap = new Map(seqRows.map((r) => [`${r.microbeCode}::${r.typeCode}`, r.seq]))

  const byPair = new Map()
  for (const c of containers) {
    const key = `${c.microbeCode}::${c.typeCode}`
    if (!byPair.has(key)) byPair.set(key, [])
    byPair.get(key).push(c)
  }

  let counterFixes = 0
  let seqNoFixes = 0

  for (const [key, list] of byPair) {
    const [microbeCode, typeCode] = key.split('::')
    const suffixes = list.map((c) => parseInt(c.containerCode.split('-').pop(), 10)).filter((n) => !isNaN(n))
    const maxSuffix = suffixes.length ? Math.max(...suffixes) : 0
    const currentCounter = seqMap.get(key) ?? 0

    const target = Math.max(currentCounter, maxSuffix)
    if (target !== currentCounter) {
      await prisma.microbialSfgContainerSeq.upsert({
        where: { microbeCode_typeCode: { microbeCode, typeCode } },
        create: { microbeCode, typeCode, seq: target },
        update: { seq: target },
      })
      counterFixes++
      console.log(`  counter ${key}: ${currentCounter} -> ${target}`)
    }

    list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    for (let i = 0; i < list.length; i++) {
      const expected = i + 1
      if (list[i].seqNo !== expected) {
        await prisma.microbialSfgContainer.update({ where: { containerId: list[i].containerId }, data: { seqNo: expected } })
        seqNoFixes++
        console.log(`  seqNo ${list[i].containerCode}: ${list[i].seqNo} -> ${expected}`)
      }
    }
  }
  console.log(`  Done — ${counterFixes} counter row(s) fixed, ${seqNoFixes} container seqNo value(s) fixed.`)
}

async function backfillMissingBatchLocations() {
  console.log('\n=== Step 2/3: backfill missing batch (inward) locations ===')
  const inwards = await prisma.microbialSfgInward.findMany({ include: { container: { select: { location: true } } } })
  const missing = inwards.filter((i) => !i.location && i.container?.location)
  for (const m of missing) {
    await prisma.microbialSfgInward.update({ where: { inwardId: m.inwardId }, data: { location: m.container.location } })
    console.log(`  fixed ${m.containerCode} / ${m.biomassBatchCode} -> ${m.container.location}`)
  }
  console.log(`  Done — ${missing.length} inward row(s) backfilled.`)
}

async function uppercaseExistingLocations() {
  console.log('\n=== Step 3/3: uppercase existing location values ===')
  let containerFixes = 0
  const containers = await prisma.microbialSfgContainer.findMany()
  for (const c of containers) {
    const data = {}
    if (c.location) {
      const up = applyRule(RULES.UPPER, c.location)
      if (up !== c.location) data.location = up
    }
    if (c.inactiveLocation) {
      const up = applyRule(RULES.UPPER, c.inactiveLocation)
      if (up !== c.inactiveLocation) data.inactiveLocation = up
    }
    if (Object.keys(data).length) {
      await prisma.microbialSfgContainer.update({ where: { containerId: c.containerId }, data })
      containerFixes++
      console.log(`  container ${c.containerCode}:`, data)
    }
  }

  let inwardFixes = 0
  const inwards = await prisma.microbialSfgInward.findMany()
  for (const i of inwards) {
    if (i.location) {
      const up = applyRule(RULES.UPPER, i.location)
      if (up !== i.location) {
        await prisma.microbialSfgInward.update({ where: { inwardId: i.inwardId }, data: { location: up } })
        inwardFixes++
        console.log(`  inward ${i.containerCode}/${i.biomassBatchCode}: ${i.location} -> ${up}`)
      }
    }
  }
  console.log(`  Done — ${containerFixes} container(s), ${inwardFixes} inward row(s) uppercased.`)
}

async function main() {
  await repairContainerSequencing()
  await backfillMissingBatchLocations()
  await uppercaseExistingLocations()
  console.log('\nAll steps complete.')
}

main()
  .catch((e) => { console.error('REPAIR FAILED:', e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())