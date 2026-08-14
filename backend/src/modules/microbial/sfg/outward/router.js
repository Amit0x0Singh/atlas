import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { previewSfgOutward, listSfgOutward, getSfgOutwardById, getSfgHistory, listEligibleBatches, listOutwardSessions } from "./get/sfg-outward.controller.js";
import { createSfgOutward, upsertOutwardSession } from "./create/sfg-outward.controller.js";
import { deleteOutwardSession } from "./delete/sfg-outward.controller.js";

const SfgOutwardRouter = express.Router();
const canView   = authorize("microbial.sfg-outward.view");
const canCreate = authorize("microbial.sfg-outward.create");

SfgOutwardRouter.post("/microbial-sfg/outward/preview", canView, previewSfgOutward);
SfgOutwardRouter.get("/microbial-sfg/outward/eligible-batches", canView, listEligibleBatches);
SfgOutwardRouter.get("/microbial-sfg/history", canView, getSfgHistory);
// Sessions — MUST be registered before the /:id wildcard below, otherwise
// Express matches "sessions" as an outward id.
SfgOutwardRouter.get("/microbial-sfg/outward/sessions", canView, listOutwardSessions);
SfgOutwardRouter.put("/microbial-sfg/outward/sessions/:id", authorize("microbial.sfg-outward.update"), upsertOutwardSession);
SfgOutwardRouter.delete("/microbial-sfg/outward/sessions/:id", authorize("microbial.sfg-outward.update"), deleteOutwardSession);
SfgOutwardRouter.get("/microbial-sfg/outward/:id", canView, getSfgOutwardById);
SfgOutwardRouter.get("/microbial-sfg/outward", canView, listSfgOutward);
SfgOutwardRouter.post("/microbial-sfg/outward", canCreate, createSfgOutward);

export default SfgOutwardRouter;
