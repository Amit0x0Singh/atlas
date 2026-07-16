import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { listErpPlans, getErpPlan, listTimeMotion, getPlannerQueue } from "./get/planning.controller.js";
import { analyseOrder, createPlan, logTimeMotion, recordQc } from "./create/planning.controller.js";
import { validateAnalyseOrder, validateCreatePlan, validateLogTimeMotion, validateRecordQc, validateJobIdParam } from "./create/planning.middleware.js";
import { submitPlan, publishPlan, startJob, delayJob } from "./update/planning.controller.js";
import { validateDelayJob } from "./update/planning.middleware.js";

const ErpPlanningRouter = express.Router();
const plannerOrAbove = authorize(["production"]);
const managerOrAbove = authorize(["production"]);
const supervisorOrAbove = authorize(["production"]);

ErpPlanningRouter.post("/planning/analyse", authenticate, plannerOrAbove, validateAnalyseOrder, analyseOrder);
ErpPlanningRouter.get("/planning/time-motion", authenticate, plannerOrAbove, listTimeMotion);
ErpPlanningRouter.post("/planning/time-motion", authenticate, supervisorOrAbove, validateLogTimeMotion, logTimeMotion);
ErpPlanningRouter.get("/planning/plans", authenticate, plannerOrAbove, listErpPlans);
ErpPlanningRouter.post("/planning/plans", authenticate, plannerOrAbove, validateCreatePlan, createPlan);
ErpPlanningRouter.get("/planning/plans/:id", authenticate, plannerOrAbove, validateJobIdParam, getErpPlan);
ErpPlanningRouter.patch("/planning/plans/:id/submit", authenticate, plannerOrAbove, validateJobIdParam, submitPlan);
ErpPlanningRouter.patch("/planning/plans/:id/publish", authenticate, managerOrAbove, validateJobIdParam, publishPlan);
ErpPlanningRouter.patch("/planning/jobs/:id/start", authenticate, supervisorOrAbove, validateJobIdParam, startJob);
ErpPlanningRouter.patch("/planning/jobs/:id/delay", authenticate, supervisorOrAbove, validateJobIdParam, validateDelayJob, delayJob);
ErpPlanningRouter.post("/planning/jobs/:id/qc", authenticate, supervisorOrAbove, validateJobIdParam, validateRecordQc, recordQc);

ErpPlanningRouter.get("/sales/planner-queue", authenticate, plannerOrAbove, getPlannerQueue);

export default ErpPlanningRouter;
