-- Supports the Stock Ledger filter bar (item/transaction-type/date-range
-- filters) without a full-table scan as the ledger grows.

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stock_ledger_item_code_idx" ON "stock_ledger"("item_code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stock_ledger_transaction_type_idx" ON "stock_ledger"("transaction_type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "stock_ledger_timestamp_idx" ON "stock_ledger"("timestamp");
