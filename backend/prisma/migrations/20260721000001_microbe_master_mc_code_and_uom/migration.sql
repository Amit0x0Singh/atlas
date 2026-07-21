-- Microbe Master: mc00001, mc00002, ... backend-generated code (same
-- "PR/EP"-style standard as product_master.product_code / equipment_master.equip_code,
-- see 20260720020000_pr_ep_code_standard). Existing rows keep whatever code
-- they already have — only new microbes get this format.
CREATE SEQUENCE IF NOT EXISTS "microbe_master_mc_code_seq";
ALTER TABLE "microbe_master"
  ALTER COLUMN "microbe_code" SET DEFAULT ('mc' || lpad((nextval('microbe_master_mc_code_seq'))::text, 5, '0'));

-- Unit of measure for this microbe's stock unit (KG/L/NOS).
ALTER TABLE "microbe_master" ADD COLUMN IF NOT EXISTS "uom" VARCHAR(10);
