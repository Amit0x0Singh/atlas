import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import BatchRouter       from "./batch/production.controller.js";
// import IndentRouter      from "./indent/indent.controller.js";
// import SfgRouter         from "./sfg/sfg.controller.js";
// import RecipeRouter      from "./recipe/recipe.controller.js";
// import BomIssuanceRouter from "./bom-issuance/bom-issuance.controller.js";

const ProductionRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/production/*        → batch
// /api/indent/*            → indent
// /api/sfg/*               → sfg
// /api/recipe/*            → recipe
// /api/erp/bom-issuance/*  → bom-issuance

export default ProductionRouter;
