import express from "express";
import BatchRouter from "./batch/router.js";
import IndentRouter from "./indent/router.js";
import SfgRouter from "./sfg/router.js";
import RecipeRouter from "./recipe/router.js";

const ProductionRouter = express.Router();

ProductionRouter.use("/", BatchRouter);
ProductionRouter.use("/", IndentRouter);
ProductionRouter.use("/", SfgRouter);
ProductionRouter.use("/", RecipeRouter);

export default ProductionRouter;
