-- Adds the two columns needed to carry forward backend/access.js's current
-- operation+plant model onto the Prisma User table, as part of migrating
-- login off the flat-file account store (18 accounts, plaintext passwords,
-- already committed to git) and onto bcrypt-hashed DB rows. See
-- src/middleware/auth.js and scripts/migrate-accounts-to-db.js.
--
-- operation: one of 'gate' | 'store' | 'production' | 'admin' (mirrors
-- access.js's OPERATIONS export). Required — every account has exactly one.
-- plant: one of access.js's PRODUCTION_PLANTS, set only for operation =
-- 'production' accounts. Nullable.
--
-- User.role (pre-existing VARCHAR(50)) is repurposed here to carry the
-- CURRENT 'admin' | 'employee' binary vocabulary from access.js — NOT the
-- richer gate_staff/store_person/planner/... vocabulary described in that
-- column's own doc comment in system.prisma. That richer vocabulary is a
-- separate future authorization feature, explicitly out of scope for this
-- hardening pass (zero-disruption migration only).
--
-- Table is currently empty (User is 100% unused by the live auth flow), so
-- NOT NULL can be added directly with no backfill/default needed.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "operation" VARCHAR(20) NOT NULL DEFAULT 'admin';
ALTER TABLE "users" ALTER COLUMN "operation" DROP DEFAULT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "plant" VARCHAR(20);
