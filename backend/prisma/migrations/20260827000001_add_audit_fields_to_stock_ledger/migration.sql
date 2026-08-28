-- stock_ledger was deliberately excluded from the earlier
-- add_audit_fields_to_business_models migration (treated as an immutable
-- run log). It's queried directly by the Ledger screen's Transaction Detail
-- view though, and that needs to show who actually performed each
-- inward/outward movement — so it gets the same standard audit columns
-- every other transactional table has.
--
-- createdAt/updatedAt are populated going forward by Prisma's own
-- @default(now()) / @updatedAt directives — the DEFAULT here only backfills
-- existing rows. createdBy/updatedBy are populated going forward by the
-- audit-stamp Prisma Client Extension (backend/src/utils/prisma-audit-extension.js);
-- existing rows are left NULL since there's no reliable actor to backfill them with.

ALTER TABLE "stock_ledger" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "stock_ledger" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "stock_ledger" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "stock_ledger" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);
