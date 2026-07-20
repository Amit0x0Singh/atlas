-- RM Master: category, sub_category, physical_state (SOLID | LIQUID | GAS),
-- and density (kg/L — lets a liquid item be purchased in KG and issued in L
-- via mass = density × volume). All nullable — no default, since 0 is not a
-- valid density and null correctly means "not applicable/unknown" here.
ALTER TABLE "rm_master" ADD COLUMN "category" TEXT;
ALTER TABLE "rm_master" ADD COLUMN "sub_category" TEXT;
ALTER TABLE "rm_master" ADD COLUMN "physical_state" TEXT;
ALTER TABLE "rm_master" ADD COLUMN "density" DOUBLE PRECISION;
