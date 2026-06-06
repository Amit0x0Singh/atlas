import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import PlanEngineRouter from "./plan-engine/plan-engine.controller.js";
// import PlanningRouter   from "./planning.controller.js";

const PlanningRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/erp/planning/*     → planning.controller.js (analyse, plans, jobs, qc, time-motion)
// /api/erp/plan-engine/*  → plan-engine (run, dashboard, pending-orders, logs)
// /api/erp/sales/planner-queue  → planning (update/planning.controller.js)

export default PlanningRouter;
