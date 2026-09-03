-- Per-transaction dispatch history for a Sales Order line item. Purely
-- additive — sales_order / sales_order_item are untouched, so every
-- existing order and item keeps working exactly as before. This table is
-- what lets one product line be dispatched several times, at different
-- quantities, on different days, independently of every other line on the
-- same DI (see SalesOrderItemDispatch in sales.prisma for the full story).
CREATE TABLE "sales_order_item_dispatch" (
  "id"                  TEXT NOT NULL,
  "sales_order_item_id" TEXT NOT NULL,
  "qty"                 DOUBLE PRECISION NOT NULL,
  "uom"                 TEXT NOT NULL,
  "invoice_no"          TEXT,
  "invoice_date"        TIMESTAMP(3),
  "transport_name"      TEXT,
  "dispatched_by"       TEXT,
  "remarks"             TEXT,
  "dispatched_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by"          VARCHAR(255),
  "updated_by"          VARCHAR(255),

  CONSTRAINT "sales_order_item_dispatch_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sales_order_item_dispatch"
  ADD CONSTRAINT "sales_order_item_dispatch_sales_order_item_id_fkey"
  FOREIGN KEY ("sales_order_item_id") REFERENCES "sales_order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "sales_order_item_dispatch_sales_order_item_id_idx" ON "sales_order_item_dispatch"("sales_order_item_id");
CREATE INDEX "sales_order_item_dispatch_dispatched_at_idx" ON "sales_order_item_dispatch"("dispatched_at");

-- Backfill: every SalesOrderItem that's already sitting at DISPATCHED today
-- has no history row (the feature didn't exist yet) — without one, it would
-- read as "0 dispatched, still fully open" under the new remaining-qty
-- logic and reappear as dispatchable. One synthetic row per such item,
-- dated at the item's own updated_at, preserves "already fully dispatched"
-- for all pre-existing data with zero behavior change.
INSERT INTO "sales_order_item_dispatch"
  ("id", "sales_order_item_id", "qty", "uom", "dispatched_at", "created_at", "updated_at", "remarks")
SELECT
  'bkfl_' || substr(md5(id || '_dispatch_backfill'), 1, 20),
  id,
  total_qty,
  total_uom,
  updated_at,
  updated_at,
  updated_at,
  'Backfilled — item was already DISPATCHED before per-item dispatch history existed'
FROM "sales_order_item"
WHERE status = 'DISPATCHED';
