-- Container lifecycle: "mark inactive" frees its rack/shelf/side/position
-- slot (hidden from Storage Map + issuance picking) while keeping all its
-- transaction history intact and searchable — ported from microbe.HTM's
-- markContainerInactive()/reactivateContainer(). inactive_location snapshots
-- the freed slot for trace purposes.
ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "inactive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "microbial_sfg_container" ADD COLUMN IF NOT EXISTS "inactive_location" TEXT;

-- Pouch-based quantity entry (No. of Pouches x Qty per Pouch = Total Qty) and
-- Received By / Remarks — ported from microbe.HTM's Inward batch form.
ALTER TABLE "microbial_sfg_inward" ADD COLUMN IF NOT EXISTS "pouch_nos" INTEGER;
ALTER TABLE "microbial_sfg_inward" ADD COLUMN IF NOT EXISTS "pouch_qty" DOUBLE PRECISION;
ALTER TABLE "microbial_sfg_inward" ADD COLUMN IF NOT EXISTS "received_by" TEXT;
ALTER TABLE "microbial_sfg_inward" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
