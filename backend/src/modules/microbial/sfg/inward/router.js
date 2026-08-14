import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { listSfgContainers, listAvailableSfgContainers, getNextContainerCode, getSfgContainerBatches, listSfgInward, getSfgInwardSummary } from "./get/sfg-inward.controller.js";
import { createSfgInward, importSfgInward } from "./create/sfg-inward.controller.js";
import { updateSfgInward } from "./update/sfg-inward.controller.js";

const SfgInwardRouter = express.Router();
const canView = authorize("microbial.sfg-inward.view");

SfgInwardRouter.get("/microbial-sfg/inward/containers/available", canView, listAvailableSfgContainers);
SfgInwardRouter.get("/microbial-sfg/inward/containers/next-code", canView, getNextContainerCode);
SfgInwardRouter.get("/microbial-sfg/inward/containers/:id/batches", canView, getSfgContainerBatches);
SfgInwardRouter.get("/microbial-sfg/inward/containers", canView, listSfgContainers);
SfgInwardRouter.get("/microbial-sfg/inward/summary", canView, getSfgInwardSummary);
SfgInwardRouter.post("/microbial-sfg/inward/import", authorize("microbial.sfg-inward.import"), importSfgInward);
SfgInwardRouter.put("/microbial-sfg/inward/:id", authorize("microbial.sfg-inward.update"), updateSfgInward);
SfgInwardRouter.get("/microbial-sfg/inward", canView, listSfgInward);
SfgInwardRouter.post("/microbial-sfg/inward", authorize("microbial.sfg-inward.create"), createSfgInward);

export default SfgInwardRouter;
