import express from "express";
import { authorize, authenticate } from "../../../middleware/auth.js";
import { listRecipe, listRecipeProducts } from "./get/recipe.controller.js";
import { bulkSaveRecipe, renameRecipe } from "./create/recipe.controller.js";
import { validateBulkSaveRecipe } from "./create/recipe.middleware.js";
import { deleteRecipeRow, deleteRecipe, deleteProductRecipe } from "./delete/recipe.controller.js";

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
RecipeRouter.post("/recipe/bulk-save", authorize("masters.recipe.create"), validateBulkSaveRecipe, bulkSaveRecipe);
RecipeRouter.patch("/recipe/rename", authorize("masters.recipe.update"), renameRecipe);
RecipeRouter.delete("/recipe/product/:productCode/recipe/:recipeNo", authorize("masters.recipe.delete"), deleteRecipe);
RecipeRouter.delete("/recipe/product/:productCode", authorize("masters.recipe.delete"), deleteProductRecipe);
RecipeRouter.delete("/recipe/:id", authorize("masters.recipe.delete"), deleteRecipeRow);
RecipeRouter.get("/recipe", canView, listRecipe);

export default RecipeRouter;
