-- Adds indexes for query patterns that were missing them: Outward had zero
-- indexes despite being filtered by sourceId/rmCode/timestamp constantly;
-- StockLedger's most common query shape (item + date range) benefits from a
-- composite index beyond its existing single-column ones; IndentDetails,
-- SalesOrderItem, and PackDetail.warehouse lacked indexes matching their
-- actual filter patterns.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "outward_source_id_idx" ON "outward"("source_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "outward_rm_code_idx" ON "outward"("rm_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "outward_timestamp_idx" ON "outward"("timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stock_ledger_item_code_timestamp_idx" ON "stock_ledger"("item_code", "timestamp");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "indent_details_indent_id_idx" ON "indent_details"("indent_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "indent_details_rm_code_idx" ON "indent_details"("rm_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "pack_detail_warehouse_idx" ON "pack_detail"("warehouse");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_order_item_sales_order_id_idx" ON "sales_order_item"("sales_order_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "sales_order_item_status_idx" ON "sales_order_item"("status");
