-- Production tasks created from BOM Issuance now remember which of the
-- product's recipes was selected (a product can hold several named recipes).
-- Without this, every downstream consumer — Microbe Outward, Material Issue
-- by BOM — fell back to the product's primary recipe (lowest recipe_no) and
-- silently issued the wrong bill of materials when a non-primary recipe was
-- chosen during planning.
--
-- product_code is stored alongside so those consumers can resolve the recipe
-- directly instead of fuzzy-matching the product name against Product Master.

ALTER TABLE "production_tasks"
  ADD COLUMN IF NOT EXISTS "recipe_no"    INTEGER,
  ADD COLUMN IF NOT EXISTS "product_code" VARCHAR(50);
