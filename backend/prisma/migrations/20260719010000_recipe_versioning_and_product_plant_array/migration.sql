-- Recipe DB: recipe_no (groups BOM lines into distinct recipes per product —
-- today every product has exactly one, recipe_no = 1) + created_at/updated_at.
ALTER TABLE "recipe_db" ADD COLUMN "recipe_no" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "recipe_db" ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "recipe_db" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

DROP INDEX IF EXISTS "recipe_db_product_code_rm_code_key";
CREATE UNIQUE INDEX "recipe_db_product_code_recipe_no_rm_code_key"
  ON "recipe_db"("product_code", "recipe_no", "rm_code");

-- Product Master: total_recipe (count of distinct recipe_no per product —
-- app-maintained, not user-editable) + plant converted from a single string
-- to an array (a product's recipe can span several plants).
ALTER TABLE "product_master" ADD COLUMN "total_recipe" INTEGER NOT NULL DEFAULT 0;

UPDATE "product_master" pm
SET "total_recipe" = sub.cnt
FROM (
  SELECT "product_code", COUNT(DISTINCT "recipe_no") AS cnt
  FROM "recipe_db"
  GROUP BY "product_code"
) sub
WHERE pm."product_code" = sub."product_code";

-- Known bad values from an import bug (a "Qty/Unit" spreadsheet column was
-- misread as the plant column) look like bare numbers, e.g. "0.14" — those
-- are not real plant names, so drop them rather than carry the bug forward.
-- (plant is still NOT NULL TEXT at this point, so clear to '' not NULL —
-- the type-conversion CASE below already maps '' to an empty array.)
UPDATE "product_master" SET "plant" = '' WHERE "plant" ~ '^[0-9.]+$';

ALTER TABLE "product_master" ALTER COLUMN "plant" DROP DEFAULT;
ALTER TABLE "product_master" ALTER COLUMN "plant" TYPE TEXT[]
  USING (CASE WHEN "plant" IS NULL OR "plant" = '' THEN ARRAY[]::TEXT[] ELSE ARRAY["plant"] END);
ALTER TABLE "product_master" ALTER COLUMN "plant" SET DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "product_master" ALTER COLUMN "plant" SET NOT NULL;
