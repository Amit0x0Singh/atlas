-- Part of the text-normalization standard (see
-- src/config/field-normalization-rules.js): all UOM-related fields and
-- "state" fields move from RULES.NONE to RULES.LOWER. The Prisma Client
-- Extension (src/utils/prisma-normalize-extension.js) only normalizes
-- values actually passed through create/update — a DB-level column
-- DEFAULT bypasses it entirely, so the default itself must be lowercased
-- to stay consistent with rows written explicitly. This does not touch
-- any existing row data.

ALTER TABLE "bom_issue_session" ALTER COLUMN "batch_uom" SET DEFAULT 'kg';
ALTER TABLE "erp_equipment" ALTER COLUMN "working_volume_unit" SET DEFAULT 'kg';
ALTER TABLE "production_plan" ALTER COLUMN "uom" SET DEFAULT 'kg';
ALTER TABLE "bom_send" ALTER COLUMN "uom" SET DEFAULT 'kg';
ALTER TABLE "sales_order_item" ALTER COLUMN "total_uom" SET DEFAULT 'kg';
ALTER TABLE "customer_product_profile" ALTER COLUMN "total_uom" SET DEFAULT 'kg';
