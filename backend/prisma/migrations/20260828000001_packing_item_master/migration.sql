-- Packing Item master — curated primary/secondary pack descriptions offered
-- as suggestions in the Sales Order line-item form. Replaces the former
-- PRIMARY_PACKING / SECONDARY_PACKING option groups.
--
-- Business tables (sales_order_item.unit_pack_type / .packing_type) keep
-- storing the plain string on their own rows — no FK to here — so
-- deactivating a packing item can never break a historical order. Same rule
-- as option_values: deactivation is the only removal path, no hard delete.
--
-- id uses gen_random_uuid()::text (same generator option_values uses) since
-- there is no Prisma client available to a hand-run migration.

CREATE TABLE IF NOT EXISTS "packing_items" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "item_code"  VARCHAR(50) NOT NULL UNIQUE,
  "name"       VARCHAR(200) NOT NULL,
  "type"       VARCHAR(20) NOT NULL,
  "is_active"  BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
  "created_by" VARCHAR(255),
  "updated_by" VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS "packing_items_type_is_active_idx"
  ON "packing_items" ("type", "is_active");

-- Retire the option groups this master supersedes. Deactivate (never drop)
-- so their historical values stay inspectable in Settings > Select Options
-- and any old form still reading them degrades to "no suggestions" rather
-- than erroring.
UPDATE "option_groups"
  SET "is_active" = false, "updated_at" = now()
  WHERE "group_code" IN ('PRIMARY_PACKING', 'SECONDARY_PACKING');
