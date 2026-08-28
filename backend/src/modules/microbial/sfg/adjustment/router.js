import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { listSfgAdjustments } from "./get/sfg-adjustment.controller.js";
import { createSfgAdjustment } from "./create/sfg-adjustment.controller.js";
import { validateCreateSfgAdjustment } from "./create/sfg-adjustment.middleware.js";

const SfgAdjustmentRouter = express.Router();
const canView   = authorize("microbial.sfg-adjustment.view");
const canCreate = authorize("microbial.sfg-adjustment.create");

SfgAdjustmentRouter.get("/microbial-sfg/adjustment", canView, listSfgAdjustments);
SfgAdjustmentRouter.post("/microbial-sfg/adjustment", canCreate, validateCreateSfgAdjustment, createSfgAdjustment);

export default SfgAdjustmentRouter;
