-- A product can have more than one recipe (recipe_no already discriminates
-- them). recipe_name lets each recipe be named so it's identifiable in the
-- Recipe Master UI and the Issue-BOM recipe picker. Denormalized across
-- every row of one (product_code, recipe_no); NULL on legacy rows.
ALTER TABLE "recipe_db" ADD COLUMN IF NOT EXISTS "recipe_name" TEXT;
