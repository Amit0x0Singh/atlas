import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { listErpPlans, getErpPlan, listTimeMotion, getPlannerQueue } from "./get/planning.controller.js";
import { analyseOrder, createPlan, logTimeMotion, recordQc } from "./create/planning.controller.js";
import { validateAnalyseOrder, validateCreatePlan, validateLogTimeMotion, validateRecordQc, validateJobIdParam } from "./create/planning.middleware.js";
import { submitPlan, publishPlan, startJob, delayJob } from "./update/planning.controller.js";
import { validateDelayJob } from "./update/planning.middleware.js";

const ErpPlanningRouter = express.Router();

ErpPlanningRouter.post("/planning/analyse", authorize("planning.engine.run"), validateAnalyseOrder, analyseOrder);
ErpPlanningRouter.get("/planning/time-motion", authorize("planning.time-motion.view"), listTimeMotion);
ErpPlanningRouter.post("/planning/time-motion", authorize("planning.time-motion.create"), validateLogTimeMotion, logTimeMotion);
ErpPlanningRouter.get("/planning/plans", authorize("planning.plan.view"), listErpPlans);
ErpPlanningRouter.post("/planning/plans", authorize("planning.plan.create"), validateCreatePlan, createPlan);
ErpPlanningRouter.get("/planning/plans/:id", authorize("planning.plan.view"), validateJobIdParam, getErpPlan);
ErpPlanningRouter.patch("/planning/plans/:id/submit", authorize("planning.plan.submit"), validateJobIdParam, submitPlan);
ErpPlanningRouter.patch("/planning/plans/:id/publish", authorize("planning.plan.publish"), validateJobIdParam, publishPlan);
ErpPlanningRouter.patch("/planning/jobs/:id/start", authorize("planning.job.update"), validateJobIdParam, startJob);
ErpPlanningRouter.patch("/planning/jobs/:id/delay", authorize("planning.job.update"), validateJobIdParam, validateDelayJob, delayJob);
ErpPlanningRouter.post("/planning/jobs/:id/qc", authorize("planning.job.qc"), validateJobIdParam, validateRecordQc, recordQc);

ErpPlanningRouter.get("/sales/planner-queue", authorize("planning.queue.view"), getPlannerQueue);

export default ErpPlanningRouter;
