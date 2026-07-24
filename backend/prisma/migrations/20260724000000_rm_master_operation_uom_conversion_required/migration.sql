-- Item Master (rm_master): operation UOM + conversion-required flag
ALTER TABLE "rm_master" ADD COLUMN "operation_uom" TEXT;
ALTER TABLE "rm_master" ADD COLUMN "conversion_required" BOOLEAN NOT NULL DEFAULT false;
