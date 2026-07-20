-- Product Master: uom (unit the finished product is stocked/sold in) and
-- physical_state (SOLID | LIQUID | GAS). Both nullable — existing products
-- don't have a known value, so leave null rather than guess one.
ALTER TABLE "product_master" ADD COLUMN "uom" TEXT;
ALTER TABLE "product_master" ADD COLUMN "physical_state" TEXT;
