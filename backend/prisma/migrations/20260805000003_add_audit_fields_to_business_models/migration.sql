-- Standard audit fields (createdAt/updatedAt/createdBy/updatedBy) across every
-- current-generation business-record table — master data + transactional
-- tables users actually create/edit. Deliberately excludes:
--   * pure sequence counters (lot_sequence, plan_sequence, so_sequence, ...)
--   * already-immutable run/audit logs with their own actor field
--     (planner_log, sheet_sync_log, stock_ledger, fifo_override_log, ...)
--   * the legacy `Erp*`-prefixed / @db.Uuid-actor tables from
--     erp-migration.sql, which key off a superseded UUID-based auth system
--     (erp_packs, stock_adjustments, bom_headers, production_plans, ...)
--
-- createdAt/updatedAt are populated going forward by Prisma's own
-- @default(now()) / @updatedAt directives — this migration only needs a
-- DEFAULT for the ALTER itself, to backfill existing rows.
-- createdBy/updatedBy are populated going forward by the audit-stamp Prisma
-- Client Extension (backend/src/utils/prisma-audit-extension.js) reading the
-- current request's authenticated user — existing rows are left NULL since
-- there's no reliable actor to backfill them with.

-- ── HR & ACCESS CONTROL ─────────────────────────────────────────────────────

ALTER TABLE "company_master" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "company_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "company_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "employee_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "employee_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "role_permission" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "role_permission" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "role_permission" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "role_permission" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- ── GATE ─────────────────────────────────────────────────────────────────────
-- Already have created_at/updated_at/created_by (the original convention
-- these audit fields were modeled on) — only updated_by is new.

ALTER TABLE "gate_inward" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);
ALTER TABLE "gate_outward" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- ── INVENTORY / RAW MATERIALS ─────────────────────────────────────────────────

ALTER TABLE "rm_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "rm_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "print_master" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "print_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "print_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "pack_detail" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "pack_detail" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "pack_detail" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "pack_detail" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "container_master" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "container_master" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "container_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "container_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "outward" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "outward" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "outward" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "outward" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- bom_issue_session already has updated_at (as part of its original design)
ALTER TABLE "bom_issue_session" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bom_issue_session" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "bom_issue_session" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- ── MICROBIAL SFG ──────────────────────────────────────────────────────────────

ALTER TABLE "microbe_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "microbe_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "microbial_sfg_inward" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "microbial_sfg_inward" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "microbial_sfg_allocation" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "microbial_sfg_allocation" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "microbial_sfg_allocation" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "microbial_sfg_outward" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "microbial_sfg_outward" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "microbial_sfg_outward" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "microbial_sfg_outward_line" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "microbial_sfg_outward_line" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "microbial_sfg_outward_line" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- microbial_sfg_outward_session already has updated_at (as part of its original design)
ALTER TABLE "microbial_sfg_outward_session" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "microbial_sfg_outward_session" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "microbial_sfg_outward_session" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- ── PLANNING ─────────────────────────────────────────────────────────────────

ALTER TABLE "production_plan" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "production_plan" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "bom_send" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bom_send" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bom_send" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "bom_send" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- ── PRODUCTION ───────────────────────────────────────────────────────────────

ALTER TABLE "product_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "product_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "equipment_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "equipment_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "production_tasks" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "production_tasks" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "recipe_db" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "recipe_db" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "indent_master" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "indent_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "indent_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "indent_details" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "indent_details" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "indent_details" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "indent_details" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "sfg_master" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "sfg_master" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "production_batch" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "production_batch" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- Batch stage-detail tables — none previously had any audit columns at all.
ALTER TABLE "biomass_input" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "biomass_input" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "biomass_input" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "biomass_input" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "technical_detail" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "technical_detail" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "technical_detail" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "technical_detail" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "formulation_cycle" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "formulation_cycle" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "formulation_cycle" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "formulation_cycle" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "unloading_log" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "unloading_log" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "unloading_log" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "unloading_log" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "sieving_log" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sieving_log" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "sieving_log" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "sieving_log" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "packing_log" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "packing_log" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "packing_log" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "packing_log" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "qc_sample" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "qc_sample" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "qc_sample" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "qc_sample" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "inventory_handover" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "inventory_handover" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "inventory_handover" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "inventory_handover" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- ── SALES ────────────────────────────────────────────────────────────────────

ALTER TABLE "sales_order" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "sales_order" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

ALTER TABLE "sales_order_item" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(255);
ALTER TABLE "sales_order_item" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(255);

-- ── SYSTEM: BACKUP / RESTORE / DELETE / TRANSFORM JOBS ────────────────────────
-- These already carry created_by-equivalent columns (created_by, started_by,
-- deleted_by) at VARCHAR(200) — new columns match that existing width rather
-- than the VARCHAR(255) used everywhere else, for consistency within each
-- table.

ALTER TABLE "backup_jobs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "backup_jobs" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(200);

ALTER TABLE "restore_jobs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "restore_jobs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "restore_jobs" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(200);
ALTER TABLE "restore_jobs" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(200);

ALTER TABLE "delete_jobs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "delete_jobs" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(200);
ALTER TABLE "delete_jobs" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(200);

ALTER TABLE "transform_jobs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "transform_jobs" ADD COLUMN IF NOT EXISTS "created_by" VARCHAR(200);
ALTER TABLE "transform_jobs" ADD COLUMN IF NOT EXISTS "updated_by" VARCHAR(200);
