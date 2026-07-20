-- New 7-character, no-hyphen code standard, applied only to NEW rows —
-- existing product_code / equip_code values are left exactly as they are.

-- Product Master: PR00001, PR00002, ... (was previously always user-typed,
-- e.g. PROD-040, RHZ-001 — those existing codes are untouched).
CREATE SEQUENCE IF NOT EXISTS "product_master_pr_code_seq";
ALTER TABLE "product_master"
  ALTER COLUMN "product_code" SET DEFAULT ('PR' || lpad((nextval('product_master_pr_code_seq'))::text, 5, '0'));

-- Equipment Master: EP00001, EP00002, ... replaces the "EQ-0001" format
-- (from migration 20260719000001) for new rows only.
CREATE SEQUENCE IF NOT EXISTS "equipment_master_ep_code_seq";
ALTER TABLE "equipment_master"
  ALTER COLUMN "equip_code" SET DEFAULT ('EP' || lpad((nextval('equipment_master_ep_code_seq'))::text, 5, '0'));
