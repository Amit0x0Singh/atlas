-- Equipment Master: equip_code (backend-generated via sequence), designated_product,
-- working_unit (UOM), updated_at; working_volume becomes NOT NULL DEFAULT 0.

-- equip_code — sequential, DB-generated so every write path (custom controller,
-- admin panel generic passthrough) gets one for free without the client sending it.
CREATE SEQUENCE IF NOT EXISTS "equipment_master_equip_code_seq";

ALTER TABLE "equipment_master"
  ADD COLUMN "equip_code" TEXT NOT NULL
    DEFAULT ('EQ-' || lpad((nextval('equipment_master_equip_code_seq'))::text, 4, '0'));

ALTER TABLE "equipment_master" ADD CONSTRAINT "equipment_master_equip_code_key" UNIQUE ("equip_code");

-- New descriptive fields
ALTER TABLE "equipment_master" ADD COLUMN "designated_product" TEXT;
ALTER TABLE "equipment_master" ADD COLUMN "working_unit" TEXT;

-- working_volume: quantity field, defaults to 0 instead of null
UPDATE "equipment_master" SET "working_volume" = 0 WHERE "working_volume" IS NULL;
ALTER TABLE "equipment_master" ALTER COLUMN "working_volume" SET NOT NULL;
ALTER TABLE "equipment_master" ALTER COLUMN "working_volume" SET DEFAULT 0;

-- updated_at
ALTER TABLE "equipment_master" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
