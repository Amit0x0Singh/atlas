import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { listRecipe, listRecipeProducts, checkRmMapping } from "./get/recipe.controller.js";
import { bulkSaveRecipe, fixRmMapping } from "./create/recipe.controller.js";
import { deleteRecipeRow, deleteProductRecipe } from "./delete/recipe.controller.js";

const RecipeRouter = express.Router();
const canView = authorize("masters.recipe.view");

RecipeRouter.get("/recipe/products", canView, listRecipeProducts);
RecipeRouter.get("/recipe/check-rm-mapping", canView, checkRmMapping);
RecipeRouter.post("/recipe/fix-rm-mapping", authorize("masters.recipe.update"), fixRmMapping);
RecipeRouter.post("/recipe/bulk-save", authorize("masters.recipe.create"), bulkSaveRecipe);
RecipeRouter.delete("/recipe/product/:productCode", authorize("masters.recipe.delete"), deleteProductRecipe);
RecipeRouter.delete("/recipe/:id", authorize("masters.recipe.delete"), deleteRecipeRow);
RecipeRouter.get("/recipe", canView, listRecipe);

export default RecipeRouter;
