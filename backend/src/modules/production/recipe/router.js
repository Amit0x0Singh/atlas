import express from "express";
import { authorize, authenticate } from "../../../middleware/auth.js";
import { listRecipe, listRecipeProducts, checkRmMapping } from "./get/recipe.controller.js";
import { bulkSaveRecipe, fixRmMapping } from "./create/recipe.controller.js";
import { validateBulkSaveRecipe, validateFixRmMapping } from "./create/recipe.middleware.js";
import { deleteRecipeRow, deleteProductRecipe } from "./delete/recipe.controller.js";

const RecipeRouter = express.Router();
// Recipe reads also power the material-issuance screens outside Master Data:
// Store's "Material Issue by BOM" (inventory.outward.*) loads a product's BOM
// to issue raw materials against it, and the Microbial transaction page
// (microbial.sfg-outward.*) does the same for microbe ingredients. Those
// roles get recipe read access here without holding masters.recipe.view.
const canView = authorize([
  "masters.recipe.view",
  "inventory.outward.view", "inventory.outward.create",
  "microbial.sfg-outward.view", "microbial.sfg-outward.create",
]);

// Any logged-in user can look recipe products up by name to power the
// autosuggest on Production Planning's Issue BOM form — a lookup needed to
// fill out a form they already have permission for, not a request to browse
// Recipe Master itself.
RecipeRouter.get("/recipe/products/search", authenticate, listRecipeProducts);
RecipeRouter.get("/recipe/products", canView, listRecipeProducts);
RecipeRouter.get("/recipe/check-rm-mapping", canView, checkRmMapping);
RecipeRouter.post("/recipe/fix-rm-mapping", authorize("masters.recipe.update"), validateFixRmMapping, fixRmMapping);
RecipeRouter.post("/recipe/bulk-save", authorize("masters.recipe.create"), validateBulkSaveRecipe, bulkSaveRecipe);
RecipeRouter.delete("/recipe/product/:productCode", authorize("masters.recipe.delete"), deleteProductRecipe);
RecipeRouter.delete("/recipe/:id", authorize("masters.recipe.delete"), deleteRecipeRow);
RecipeRouter.get("/recipe", canView, listRecipe);

export default RecipeRouter;
