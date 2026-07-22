import express from "express";
import { authenticate } from "../../../../middleware/auth.js";
import { previewSfgOutward, listSfgOutward, getSfgOutwardById, getSfgHistory, listEligibleBatches } from "./get/sfg-outward.controller.js";
import { createSfgOutward } from "./create/sfg-outward.controller.js";

const SfgOutwardRouter = express.Router();

SfgOutwardRouter.post("/microbial-sfg/outward/preview", authenticate, previewSfgOutward);
SfgOutwardRouter.get("/microbial-sfg/outward/eligible-batches", authenticate, listEligibleBatches);
SfgOutwardRouter.get("/microbial-sfg/history", authenticate, getSfgHistory);
SfgOutwardRouter.get("/microbial-sfg/outward/:id", authenticate, getSfgOutwardById);
SfgOutwardRouter.get("/microbial-sfg/outward", authenticate, listSfgOutward);
SfgOutwardRouter.post("/microbial-sfg/outward", authenticate, createSfgOutward);

export default SfgOutwardRouter;
