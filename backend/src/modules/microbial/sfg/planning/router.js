import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { checkPlanMicrobes, getAllocationsForPlan, getProductMicrobeRequirements } from "./get/sfg-planning.controller.js";
import { allocateSfg } from "./create/sfg-planning.controller.js";
import { cancelAllocation } from "./delete/sfg-planning.controller.js";

const SfgPlanningRouter = express.Router();
const canView = authorize("microbial.sfg-planning.view");

SfgPlanningRouter.get("/microbial-sfg/planning/product-microbes", canView, getProductMicrobeRequirements);
SfgPlanningRouter.get("/microbial-sfg/planning/check/:planId", canView, checkPlanMicrobes);
SfgPlanningRouter.post("/microbial-sfg/planning/allocate", authorize("microbial.sfg-planning.create"), allocateSfg);
SfgPlanningRouter.get("/microbial-sfg/planning/allocations/:planId", canView, getAllocationsForPlan);
SfgPlanningRouter.delete("/microbial-sfg/planning/allocations/:id", authorize("microbial.sfg-planning.update"), cancelAllocation);

export default SfgPlanningRouter;
