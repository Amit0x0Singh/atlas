-- Part of the text-normalization standard (see
-- src/config/field-normalization-rules.js): ProductionBatch.category moves
-- from RULES.NONE to RULES.LOWER. The Prisma Client Extension
-- (src/utils/prisma-normalize-extension.js) only normalizes values actually
-- passed through create/update — a DB-level column DEFAULT bypasses it
-- entirely, so the default itself must be lowercased to stay consistent with
-- rows written explicitly. This does not touch any existing row data.

ALTER TABLE "production_batch" ALTER COLUMN "category" SET DEFAULT 'powder';
