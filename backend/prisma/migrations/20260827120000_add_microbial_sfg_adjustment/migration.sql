-- Microbial SFG stock loss adjustments — biomass lost during issuance,
-- release to production, or transport between storage locations. Booked
-- against a single inward batch; the deduction is mirrored onto that
-- batch's container in the same application-level transaction. Deduction
-- only (loss_qty_kg is always the positive magnitude removed). Who/when is
-- tracked by the standard created_by / created_at audit columns.

CREATE TABLE IF NOT EXISTS "microbial_sfg_adjustment" (
    "adjustment_id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "inward_id"            TEXT NOT NULL,
    "container_id"         TEXT,
    "container_code"       TEXT NOT NULL,
    "microbe_id"           TEXT,
    "microbe_code"         TEXT NOT NULL,
    "microbe_name"         TEXT NOT NULL,
    "microbe_type"         TEXT NOT NULL,
    "loss_qty_kg"          DOUBLE PRECISION NOT NULL,
    "cfu_per_g_at_adjust"  DOUBLE PRECISION,
    "balance_before_kg"    DOUBLE PRECISION NOT NULL,
    "balance_after_kg"     DOUBLE PRECISION NOT NULL,
    "reason_category"      TEXT NOT NULL,
    "reason"               TEXT NOT NULL,
    "stage"                TEXT,
    "remarks"              TEXT,
    "batch_code"           TEXT,
    "created_at"           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"           TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by"           VARCHAR(255),
    "updated_by"           VARCHAR(255),

    CONSTRAINT "microbial_sfg_adjustment_pkey" PRIMARY KEY ("adjustment_id")
);

CREATE INDEX IF NOT EXISTS "microbial_sfg_adjustment_inward_id_idx"    ON "microbial_sfg_adjustment"("inward_id");
CREATE INDEX IF NOT EXISTS "microbial_sfg_adjustment_microbe_code_idx" ON "microbial_sfg_adjustment"("microbe_code");
CREATE INDEX IF NOT EXISTS "microbial_sfg_adjustment_created_at_idx"   ON "microbial_sfg_adjustment"("created_at");

ALTER TABLE "microbial_sfg_adjustment"
    ADD CONSTRAINT "microbial_sfg_adjustment_inward_id_fkey"
    FOREIGN KEY ("inward_id") REFERENCES "microbial_sfg_inward"("inward_id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Environments that already created this table with the earlier shape
-- (adjusted_by / adjusted_at) — drop those; created_by / created_at cover it.
ALTER TABLE "microbial_sfg_adjustment" DROP COLUMN IF EXISTS "adjusted_by";
DROP INDEX IF EXISTS "microbial_sfg_adjustment_adjusted_at_idx";
ALTER TABLE "microbial_sfg_adjustment" DROP COLUMN IF EXISTS "adjusted_at";
