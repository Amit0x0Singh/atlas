// One-time (idempotent) migration: hashes each backend/access.js account's
// CURRENT plaintext password with bcrypt and upserts it into the users
// table, so login can be cut over from the flat-file store to the DB.
// Safe to re-run — upserts by lowercased email; re-running after editing a
// password in access.js re-hashes and overwrites (expected/desired until
// access.js is deleted at the end of this migration).
//
// Usage:
//   node backend/scripts/migrate-accounts-to-db.js --dry-run   (report only)
//   node backend/scripts/migrate-accounts-to-db.js             (real run)

import 'dotenv/config'
import bcrypt from 'bcryptjs'
import prisma from '../config/db.js'
import { accounts } from '../access.js'

const DRY_RUN = process.argv.includes('--dry-run')
const SALT_ROUNDS = 12

async function main() {
  let created = 0, updated = 0
  for (const acc of accounts) {
    const email = acc.email.toLowerCase()
    if (DRY_RUN) {
      console.log(`[dry-run] would upsert ${email} (role=${acc.role}, operation=${acc.operation}, plant=${acc.plant ?? '-'})`)
      continue
    }
    const passwordHash = await bcrypt.hash(acc.password, SALT_ROUNDS)
    const existing = await prisma.user.findUnique({ where: { email } })
    await prisma.user.upsert({
      where: { email },
      create: { username: email, email, passwordHash, fullName: acc.fullName, role: acc.role, operation: acc.operation, plant: acc.plant, isActive: true },
      update: { passwordHash, fullName: acc.fullName, role: acc.role, operation: acc.operation, plant: acc.plant, isActive: true },
    })
    if (existing) updated++
    else created++
  }
  console.log(DRY_RUN ? `Dry run complete (${accounts.length} accounts).` : `Done. Created ${created}, updated ${updated} (of ${accounts.length}).`)
  await prisma.$disconnect()
}

main().catch((err) => { console.error(err); process.exit(1) })
