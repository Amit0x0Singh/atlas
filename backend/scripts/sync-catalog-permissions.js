// CLI-only, idempotent, ADDITIVE. Syncs the permission catalog
// (src/constants/permissions.catalog.js) into the database and grants any
// brand-new permission to the roles that should hold it — without removing
// or rebuilding any existing role's permission set.
//
// Run this on an environment (e.g. production) after deploying code that
// added new permission keys, when running the full `prisma db seed` would
// be too broad (it also seeds product/sales/plan demo data).
//
// What it does:
//   1. Upserts every catalog permission (creates missing, refreshes
//      module/resource/action/description on existing). Never deletes.
//   2. For each permission that had NO role mappings before this run (i.e.
//      brand new), attaches it to:
//        - the "Super Admin" role (which is meant to hold everything), and
//        - every role that already holds a sibling permission in the same
//          module.resource with the same action (e.g. a new
//          `microbial.sfg-adjustment.view` follows every role that has
//          `microbial.sfg-outward.view`).
//
// Usage:
//   node backend/scripts/sync-catalog-permissions.js --dry-run   (report only)
//   node backend/scripts/sync-catalog-permissions.js             (apply)

import 'dotenv/config'
import prisma from '../config/db.js'
import { PERMISSIONS } from '../src/constants/permissions.catalog.js'

const DRY_RUN = process.argv.includes('--dry-run')
const log = (...a) => console.log(...a)

async function main() {
  log(`\n🔑  Catalog permission sync ${DRY_RUN ? '(dry run)' : ''}\n`)

  // ── 1. Which catalog keys are new to this DB? ──────────────────────────
  const existing = await prisma.permission.findMany({ select: { key: true } })
  const existingKeys = new Set(existing.map((p) => p.key))
  const newPerms = PERMISSIONS.filter((p) => !existingKeys.has(p.key))

  log(`Catalog: ${PERMISSIONS.length} keys · already in DB: ${existingKeys.size} · new: ${newPerms.length}`)
  if (newPerms.length) log('  new →', newPerms.map((p) => p.key).join(', '))

  if (!DRY_RUN) {
    for (const p of PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key: p.key },
        update: { module: p.module, resource: p.resource, action: p.action, description: p.description },
        create: p,
      })
    }
    log('✓ upserted all catalog permissions')
  }

  if (!newPerms.length) { log('\nNothing new to grant.\n'); return }

  // ── 2. Grant each new permission to the right roles ────────────────────
  const roles = await prisma.role.findMany({
    include: { permissions: { include: { permission: true } } },
  })
  const superAdmin = roles.find((r) => r.name === 'Super Admin')

  for (const np of newPerms) {
    const permRow = await prisma.permission.findUnique({ where: { key: np.key } })
    if (!permRow) { log(`  ! ${np.key} not found after upsert — skipped`); continue }

    // A role "should" get this new permission if it already holds a sibling:
    // same module, same resource GROUP (first token of the hyphenated
    // resource, e.g. "sfg" from "sfg-adjustment" / "sfg-outward"), same
    // action. Super Admin always gets it.
    const group = np.resource.split('-')[0]
    const targetRoleIds = new Set()
    if (superAdmin) targetRoleIds.add(superAdmin.roleId)
    for (const role of roles) {
      const holdsSibling = role.permissions.some((rp) => {
        const [mod, res, act] = rp.permission.key.split('.')
        return mod === np.module && res?.split('-')[0] === group && act === np.action && rp.permission.key !== np.key
      })
      if (holdsSibling) targetRoleIds.add(role.roleId)
    }

    const roleNames = roles.filter((r) => targetRoleIds.has(r.roleId)).map((r) => r.name)
    log(`  ${np.key} → ${roleNames.length ? roleNames.join(', ') : '(no matching roles — only Super Admin if present)'}`)

    if (!DRY_RUN) {
      for (const roleId of targetRoleIds) {
        const exists = await prisma.rolePermissionMap.findFirst({ where: { roleId, permissionId: permRow.permissionId } })
        if (!exists) await prisma.rolePermissionMap.create({ data: { roleId, permissionId: permRow.permissionId } })
      }
    }
  }

  log(`\n${DRY_RUN ? 'Dry run complete — no changes written.' : '✓ Done. Users pick up the change on their next /auth/me (window focus / re-login) or within ~45s.'}\n`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
