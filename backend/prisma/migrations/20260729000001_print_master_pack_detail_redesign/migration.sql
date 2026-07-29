-- Redesign: PrintMaster splits into a header (one row per item generated
-- within a Gate Inward entry) + PackDetail (one row per bag, absorbing what
-- used to be InwardSession + Inward + PackBalance). PrintMaster no longer
-- stores supplier/invoice/received-date directly — those are read through
-- the new mandatory gate_inward_id FK.

-- ── Step 1: add gate_inward_id to the (still per-bag) print_master table ────
ALTER TABLE "print_master" ADD COLUMN "gate_inward_id" UUID;

-- ── Step 2: backfill — create a GateInward row for any (supplier, invoice)
--    combination on print_master that doesn't already have one ───────────────
INSERT INTO "gate_inward" (inward_id, supplier_name, invoice_no, vehicle_no, company_name, status, created_by, entry_time, num_packs, request_delete, created_at, updated_at)
SELECT
  gen_random_uuid(),
  COALESCE(pm.supplier, 'Unknown Supplier'),
  pm.invoice_no,
  NULL,
  NULL,
  'approved',
  NULL,
  MIN(pm.received_date),
  NULL,
  false,
  now(),
  now()
FROM "print_master" pm
WHERE NOT EXISTS (
  SELECT 1 FROM "gate_inward" gi
  WHERE gi.invoice_no IS NOT DISTINCT FROM pm.invoice_no
    AND gi.supplier_name = COALESCE(pm.supplier, 'Unknown Supplier')
)
GROUP BY COALESCE(pm.supplier, 'Unknown Supplier'), pm.invoice_no;

-- ── Step 3: backfill gate_inward_id on every print_master row, picking the
--    most recently created matching gate_inward row ─────────────────────────
UPDATE "print_master" pm
SET "gate_inward_id" = (
  SELECT gi.inward_id FROM "gate_inward" gi
  WHERE gi.invoice_no IS NOT DISTINCT FROM pm.invoice_no
    AND gi.supplier_name = COALESCE(pm.supplier, 'Unknown Supplier')
  ORDER BY gi.created_at DESC
  LIMIT 1
);

-- Fail loudly (rather than silently) if any row couldn't be matched —
-- step 2 should guarantee a match exists for every row.
ALTER TABLE "print_master" ALTER COLUMN "gate_inward_id" SET NOT NULL;

-- ── Step 4: move the old per-bag table out of the way ────────────────────────
ALTER TABLE "print_master" RENAME TO "print_master_old";
ALTER TABLE "print_master_old" RENAME CONSTRAINT "print_master_pkey" TO "print_master_old_pkey";

-- ── Step 5: create the new header + bag tables ────────────────────────────────
CREATE TABLE "print_master" (
    "id" TEXT NOT NULL,
    "gate_inward_id" UUID NOT NULL,
    "item_code" TEXT NOT NULL,
    "item_name" TEXT NOT NULL,
    "lot_no" TEXT NOT NULL,
    "pack_qty" DOUBLE PRECISION NOT NULL,
    "number_of_bags" INTEGER NOT NULL,
    "uom" TEXT NOT NULL,
    "customer_batch_code" TEXT,
    "expiry_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "print_master_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "print_master_item_code_lot_no_key" ON "print_master"("item_code", "lot_no");
CREATE INDEX "print_master_gate_inward_id_idx" ON "print_master"("gate_inward_id");

CREATE TABLE "pack_detail" (
    "pack_id" TEXT NOT NULL,
    "print_master_id" TEXT NOT NULL,
    "item_code" TEXT NOT NULL,
    "bag_no" INTEGER NOT NULL,
    "total_qty" DOUBLE PRECISION NOT NULL,
    "remaining_qty" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'AWAITING_INWARD',
    "warehouse" TEXT,
    "scanned_at" TIMESTAMP(3),
    "inwarded_at" TIMESTAMP(3),

    CONSTRAINT "pack_detail_pkey" PRIMARY KEY ("pack_id")
);

CREATE UNIQUE INDEX "pack_detail_print_master_id_bag_no_key" ON "pack_detail"("print_master_id", "bag_no");
CREATE INDEX "pack_detail_item_code_idx" ON "pack_detail"("item_code");
CREATE INDEX "pack_detail_status_idx" ON "pack_detail"("status");

-- ── Step 6: populate the header table — one row per (item_code, lot_no)
--    group in the old per-bag table ──────────────────────────────────────────
INSERT INTO "print_master" (id, gate_inward_id, item_code, item_name, lot_no, pack_qty, number_of_bags, uom, customer_batch_code, expiry_date, created_at)
SELECT
  gen_random_uuid()::text,
  MAX(po.gate_inward_id::text)::uuid,
  po.item_code,
  MAX(po.item_name),
  po.lot_no,
  MAX(po.pack_qty),
  COUNT(*),
  MAX(po.uom),
  MAX(po.customer_batch_code),
  MAX(po.expiry_date),
  MIN(po.created_at)
FROM "print_master_old" po
GROUP BY po.item_code, po.lot_no;

ALTER TABLE "print_master" ADD CONSTRAINT "print_master_gate_inward_id_fkey" FOREIGN KEY ("gate_inward_id") REFERENCES "gate_inward"("inward_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Step 7: populate pack_detail — one row per old print_master_old row,
--    linked to the new header by (item_code, lot_no) ─────────────────────────
-- pack_balance/inward are both empty in every environment this has been
-- verified against, so remaining_qty = total_qty (= pack_qty) for every
-- migrated bag and status carries over as-is.
INSERT INTO "pack_detail" (pack_id, print_master_id, item_code, bag_no, total_qty, remaining_qty, status, warehouse, scanned_at, inwarded_at)
SELECT
  po.pack_id,
  pm.id,
  po.item_code,
  po.bag_no,
  po.pack_qty,
  po.pack_qty,
  COALESCE(po.status, 'AWAITING_INWARD'),
  NULL,
  NULL,
  CASE WHEN po.status = 'INWARDED' THEN po.created_at ELSE NULL END
FROM "print_master_old" po
JOIN "print_master" pm ON pm.item_code = po.item_code AND pm.lot_no = po.lot_no;

ALTER TABLE "pack_detail" ADD CONSTRAINT "pack_detail_print_master_id_fkey" FOREIGN KEY ("print_master_id") REFERENCES "print_master"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── Step 8: drop the old per-bag table and the three models it replaces ──────
DROP TABLE "print_master_old";
DROP TABLE "inward_session";
DROP TABLE "inward";
DROP TABLE "pack_balance";
