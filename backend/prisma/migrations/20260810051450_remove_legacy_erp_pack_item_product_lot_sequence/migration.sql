-- Decommissions the legacy "erp-migration.sql" pack/item/product tracking
-- subsystem, superseded by the RmMaster / ProductMaster / GateInward /
-- PackDetail / LotSequence pipeline. All 13 tables below had zero rows at
-- the time of this migration and zero live backend routes or frontend
-- callers (verified before writing this migration) — nothing but this dead
-- subsystem itself referenced them. Drops ErpPack, ErpItem, ErpProduct and
-- GateLotSequence plus their exclusively-dependent satellite tables
-- (StockAdjustment, WarehouseTransfer, FifoOverrideLog, ErpContainer,
-- DecantingLog, ErpBomHeader, ErpBomLineFormulation, ErpBomLinePacking,
-- ErpBomIssuance), which had no purpose independent of the four models
-- being removed.

-- DropForeignKey
ALTER TABLE "bom_headers" DROP CONSTRAINT "bom_headers_approved_by_fkey";

-- DropForeignKey
ALTER TABLE "bom_headers" DROP CONSTRAINT "bom_headers_product_code_fkey";

-- DropForeignKey
ALTER TABLE "bom_issuance" DROP CONSTRAINT "bom_issuance_job_id_fkey";

-- DropForeignKey
ALTER TABLE "bom_issuance" DROP CONSTRAINT "bom_issuance_pack_id_fkey";

-- DropForeignKey
ALTER TABLE "bom_lines_formulation" DROP CONSTRAINT "bom_lines_formulation_bom_id_fkey";

-- DropForeignKey
ALTER TABLE "bom_lines_formulation" DROP CONSTRAINT "bom_lines_formulation_item_code_fkey";

-- DropForeignKey
ALTER TABLE "bom_lines_packing" DROP CONSTRAINT "bom_lines_packing_bom_id_fkey";

-- DropForeignKey
ALTER TABLE "bom_lines_packing" DROP CONSTRAINT "bom_lines_packing_item_code_fkey";

-- DropForeignKey
ALTER TABLE "decanting_log" DROP CONSTRAINT "decanting_log_source_pack_id_fkey";

-- DropForeignKey
ALTER TABLE "decanting_log" DROP CONSTRAINT "decanting_log_target_container_fkey";

-- DropForeignKey
ALTER TABLE "erp_containers" DROP CONSTRAINT "erp_containers_item_code_fkey";

-- DropForeignKey
ALTER TABLE "erp_items" DROP CONSTRAINT "erp_items_supplier_default_fkey";

-- DropForeignKey
ALTER TABLE "erp_packs" DROP CONSTRAINT "erp_packs_inward_id_fkey";

-- DropForeignKey
ALTER TABLE "erp_packs" DROP CONSTRAINT "erp_packs_item_code_fkey";

-- DropForeignKey
ALTER TABLE "erp_products" DROP CONSTRAINT "erp_products_alternate_plant_id_fkey";

-- DropForeignKey
ALTER TABLE "erp_products" DROP CONSTRAINT "erp_products_microbial_strain_id_fkey";

-- DropForeignKey
ALTER TABLE "erp_products" DROP CONSTRAINT "erp_products_plant_id_fkey";

-- DropForeignKey
ALTER TABLE "stock_adjustments" DROP CONSTRAINT "stock_adjustments_pack_id_fkey";

-- DropForeignKey
ALTER TABLE "warehouse_transfers" DROP CONSTRAINT "warehouse_transfers_pack_id_fkey";

-- DropTable
DROP TABLE "bom_headers";

-- DropTable
DROP TABLE "bom_issuance";

-- DropTable
DROP TABLE "bom_lines_formulation";

-- DropTable
DROP TABLE "bom_lines_packing";

-- DropTable
DROP TABLE "decanting_log";

-- DropTable
DROP TABLE "erp_containers";

-- DropTable
DROP TABLE "erp_items";

-- DropTable
DROP TABLE "erp_packs";

-- DropTable
DROP TABLE "erp_products";

-- DropTable
DROP TABLE "fifo_override_log";

-- DropTable
DROP TABLE "gate_lot_sequences";

-- DropTable
DROP TABLE "stock_adjustments";

-- DropTable
DROP TABLE "warehouse_transfers";
