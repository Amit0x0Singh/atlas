import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { listSfg, getSfgSummary, getSfg } from "./get/sfg.controller.js";
import { updateSfg } from "./update/sfg.controller.js";

const SfgRouter = express.Router();
const canView = authorize("production.sfg.view");

SfgRouter.get("/sfg/summary", canView, getSfgSummary);
SfgRouter.get("/sfg/:sfgId", canView, getSfg);
SfgRouter.get("/sfg", canView, listSfg);
SfgRouter.put("/sfg/:sfgId", authorize("production.sfg.update"), updateSfg);

export default SfgRouter;
