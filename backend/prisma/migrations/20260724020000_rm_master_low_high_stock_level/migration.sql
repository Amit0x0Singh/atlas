-- Item Master (rm_master): low/high stock reorder-level thresholds
ALTER TABLE "rm_master" ADD COLUMN "low_stock_level" DOUBLE PRECISION;
ALTER TABLE "rm_master" ADD COLUMN "high_stock_level" DOUBLE PRECISION;
