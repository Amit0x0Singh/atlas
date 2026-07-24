import express from "express";
import { authenticate } from "../../../../middleware/auth.js";
import { previewSfgOutward, listSfgOutward, getSfgOutwardById, getSfgHistory, listEligibleBatches, listOutwardSessions } from "./get/sfg-outward.controller.js";
import { createSfgOutward, upsertOutwardSession } from "./create/sfg-outward.controller.js";
import { deleteOutwardSession } from "./delete/sfg-outward.controller.js";

const SfgOutwardRouter = express.Router();

SfgOutwardRouter.post("/microbial-sfg/outward/preview", authenticate, previewSfgOutward);
SfgOutwardRouter.get("/microbial-sfg/outward/eligible-batches", authenticate, listEligibleBatches);
SfgOutwardRouter.get("/microbial-sfg/history", authenticate, getSfgHistory);
// Sessions — MUST be registered before the /:id wildcard below, otherwise
// Express matches "sessions" as an outward id.
SfgOutwardRouter.get("/microbial-sfg/outward/sessions", authenticate, listOutwardSessions);
SfgOutwardRouter.put("/microbial-sfg/outward/sessions/:id", authenticate, upsertOutwardSession);
SfgOutwardRouter.delete("/microbial-sfg/outward/sessions/:id", authenticate, deleteOutwardSession);
SfgOutwardRouter.get("/microbial-sfg/outward/:id", authenticate, getSfgOutwardById);
SfgOutwardRouter.get("/microbial-sfg/outward", authenticate, listSfgOutward);
SfgOutwardRouter.post("/microbial-sfg/outward", authenticate, createSfgOutward);

export default SfgOutwardRouter;
