-- Packing Material master and Bulk Lot tracking (BulkLocation, BulkLotEntry,
-- BulkLotSequence) are no longer used — the master and its backend/frontend
-- integrations were removed alongside this migration.

-- DropForeignKey
ALTER TABLE "bulk_lot_entry" DROP CONSTRAINT "bulk_lot_entry_location_id_fkey";

-- DropTable
DROP TABLE "bulk_location";

-- DropTable
DROP TABLE "bulk_lot_entry";

-- DropTable
DROP TABLE "bulk_lot_sequence";

-- DropTable
DROP TABLE "packing_materials";
