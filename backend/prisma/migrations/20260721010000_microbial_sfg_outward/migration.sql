-- Microbial SFG Outward / Issuance: one header row per issuance transaction
-- (product/customer/DI/batch), one line row per container actually drawn
-- from (FEFO can split a single microbe requirement across several batches
-- — mirrors microbe.HTM's mi_issuances ledger, one entry per pick).
CREATE TABLE "microbial_sfg_outward" (
  "outward_id"    TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
  "product_name"  TEXT NOT NULL,
  "customer_name" TEXT,
  "di_number"     TEXT,
  "batch_code"    TEXT,
  "section"       TEXT,
  "order_qty_kg"  DOUBLE PRECISION,
  "issuer_name"   TEXT,
  "receiver_name" TEXT,
  "issued_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "microbial_sfg_outward_pkey" PRIMARY KEY ("outward_id")
);

CREATE TABLE "microbial_sfg_outward_line" (
  "line_id"            TEXT NOT NULL DEFAULT (gen_random_uuid()::text),
  "outward_id"         TEXT NOT NULL,
  "microbe_id"         TEXT,
  "microbe_code"       TEXT NOT NULL,
  "microbe_name"       TEXT NOT NULL,
  "microbe_type"       TEXT NOT NULL,
  "required_qty_kg"    DOUBLE PRECISION NOT NULL,
  "required_cfu_per_g" DOUBLE PRECISION NOT NULL,
  "inward_id"          TEXT NOT NULL,
  "container_id"       TEXT NOT NULL,
  "container_code"     TEXT NOT NULL,
  "qty_issued_kg"      DOUBLE PRECISION NOT NULL,
  "cfu_per_g_at_issue" DOUBLE PRECISION NOT NULL,
  "balance_after_kg"   DOUBLE PRECISION NOT NULL,
  "is_partial"         BOOLEAN NOT NULL DEFAULT false,
  "created_at"         TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "microbial_sfg_outward_line_pkey" PRIMARY KEY ("line_id")
);

ALTER TABLE "microbial_sfg_outward_line"
  ADD CONSTRAINT "microbial_sfg_outward_line_outward_id_fkey"
  FOREIGN KEY ("outward_id") REFERENCES "microbial_sfg_outward"("outward_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "microbial_sfg_outward_line"
  ADD CONSTRAINT "microbial_sfg_outward_line_inward_id_fkey"
  FOREIGN KEY ("inward_id") REFERENCES "microbial_sfg_inward"("inward_id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "microbial_sfg_outward_line_outward_id_idx" ON "microbial_sfg_outward_line"("outward_id");
CREATE INDEX "microbial_sfg_outward_line_inward_id_idx" ON "microbial_sfg_outward_line"("inward_id");
CREATE INDEX "microbial_sfg_outward_line_microbe_code_idx" ON "microbial_sfg_outward_line"("microbe_code");
