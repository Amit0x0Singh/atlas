import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { PERMISSIONS } from '../src/constants/permissions.catalog.js'
import { ROLE_SEEDS, LEGACY_ACCOUNTS } from '../src/constants/roles.seed.js'
const prisma = new PrismaClient()

const log = (msg) => console.log(`  ✓ ${msg}`)

async function seedPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      update: { module: p.module, resource: p.resource, action: p.action, description: p.description },
      create: p,
    })
  }
  log(`Permissions — ${PERMISSIONS.length} catalog entries`)
}

async function seedRoles() {
  for (const r of ROLE_SEEDS) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: { name: r.name, description: r.description, isSystem: r.isSystem },
    })
    const perms = await prisma.permission.findMany({ where: { key: { in: r.permissions } }, select: { permissionId: true } })
    await prisma.rolePermissionMap.deleteMany({ where: { roleId: role.roleId } })
    if (perms.length) {
      await prisma.rolePermissionMap.createMany({
        data: perms.map((p) => ({ roleId: role.roleId, permissionId: p.permissionId })),
        skipDuplicates: true,
      })
    }
  }
  log(`Roles — ${ROLE_SEEDS.length} roles seeded with their permission sets`)
}

async function seedAdminAccount() {
  const acct = LEGACY_ACCOUNTS.find((a) => a.email === 'admin@agrilife.com')
  if (!acct) throw new Error('seedAdminAccount: admin@agrilife.com not found in LEGACY_ACCOUNTS')

  const role = await prisma.role.findUnique({ where: { name: acct.role } })
  if (!role) throw new Error(`seedAdminAccount: role "${acct.role}" not found — did seedRoles() run first?`)

  let user = await prisma.user.findUnique({ where: { email: acct.email } })
  if (!user) {
    const passwordHash = await bcrypt.hash(acct.password, 10)
    user = await prisma.user.create({
      data: {
        username: acct.email,
        email: acct.email,
        passwordHash,
        fullName: acct.fullName,
        plants: acct.plant ? [acct.plant] : [],
        isActive: true,
      },
    })
    log(`Admin user — created ${acct.email} (password: ${acct.password})`)
  } else {
    log(`Admin user — ${acct.email} already exists, left password untouched`)
  }

  await prisma.userRole.deleteMany({ where: { userId: user.userId } })
  await prisma.userRole.create({ data: { userId: user.userId, roleId: role.roleId } })
  log(`Admin user — assigned role "${acct.role}"`)
}

async function main() {
  console.log('\n🌱  SOM ERP — Admin-only seed\n')
  await seedPermissions()
  await seedRoles()
  await seedAdminAccount()
  console.log('\n✅  Admin seed complete — log in with admin@agrilife.com\n')
}

main()
  .catch((e) => { console.error('❌ Admin seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
