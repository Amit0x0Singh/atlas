import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { listPlans, getPlan, listLogs, getDashboard, listPendingOrders } from "./get/plan-engine.controller.js";
import { runEngine } from "./create/plan-engine.controller.js";
import { patchPlan } from "./update/plan-engine.controller.js";
import { validatePlanIdParam, sanitizePatchPlan } from "./update/plan-engine.middleware.js";
import { cancelPlan } from "./delete/plan-engine.controller.js";

const PlanEngineRouter = express.Router();
const canViewEngine = authorize("planning.engine.view");
const canViewPlan   = authorize("planning.plan.view");

PlanEngineRouter.post("/plan-engine/run", authorize("planning.engine.run"), runEngine);
PlanEngineRouter.get("/plan-engine/dashboard", canViewEngine, getDashboard);
PlanEngineRouter.get("/plan-engine/pending-orders", canViewEngine, listPendingOrders);
PlanEngineRouter.get("/plan-engine/logs", canViewEngine, listLogs);
PlanEngineRouter.get("/plan-engine/plans", canViewPlan, listPlans);
PlanEngineRouter.get("/plan-engine/plans/:id", canViewPlan, validatePlanIdParam, getPlan);
PlanEngineRouter.patch("/plan-engine/plans/:id", authorize("planning.plan.submit"), validatePlanIdParam, sanitizePatchPlan, patchPlan);
PlanEngineRouter.delete("/plan-engine/plans/:id", authorize("planning.plan.cancel"), validatePlanIdParam, cancelPlan);

export default PlanEngineRouter;
