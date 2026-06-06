import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import MicrobialErpRouter   from "./erp-microbial/microbial.controller.js";
// import SfgMasterRouter      from "./sfg/master/sfg-master.controller.js";
// import SfgInwardRouter      from "./sfg/inward/sfg-inward.controller.js";
// import SfgPlanningRouter    from "./sfg/planning/sfg-planning.controller.js";

const MicrobialRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/microbial-sfg/masters/*   → sfg/master
// /api/microbial-sfg/inward/*    → sfg/inward
// /api/microbial-sfg/planning/*  → sfg/planning
// /api/erp/microbial/*           → erp-microbial (containers, transactions, allocations)

export default MicrobialRouter;
