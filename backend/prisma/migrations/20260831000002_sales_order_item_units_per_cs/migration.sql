-- SalesOrderItem was missing `units_per_cs` even though the order form has
-- always collected "Units per Sec. Pack" per line and both the create and
-- update controllers try to persist it — causing createSalesOrder to crash
-- with "Unknown argument `unitsPerCS`" on every submission. Purely additive,
-- nullable column; no existing data touched.
ALTER TABLE "sales_order_item" ADD COLUMN IF NOT EXISTS "units_per_cs" INTEGER;
