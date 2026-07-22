-- Real physical storage addressing for the Microbes Dashboard's Storage Map
-- (15 racks x 8 shelves x 2 sides x 3 positions = 720 slots, matching the
-- microbe.HTM prototype's R{rack}-S{shelf}-{side}-{position} scheme). New
-- containers pick an actual free slot; existing containers keep their
-- current free-text `location` and simply won't appear on the grid until
-- reassigned a slot (not retroactive, same convention used for equip_code /
-- product_code / rm item-code standardization earlier in this project).
ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "rack" INTEGER;
ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "shelf" INTEGER;
ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "side" VARCHAR(1);
ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "position" VARCHAR(1);

CREATE INDEX IF NOT EXISTS "microbial_sfg_container_rack_shelf_side_position_idx"
  ON "microbial_sfg_container" ("rack", "shelf", "side", "position");
