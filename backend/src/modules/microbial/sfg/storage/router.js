import express from "express";
import { authenticate } from "../../../../middleware/auth.js";
import { getStorageGrid, getAvailableSlots } from "./get/sfg-storage.controller.js";
import { markContainerInactive, reactivateContainer } from "./update/sfg-storage.controller.js";

const SfgStorageRouter = express.Router();

SfgStorageRouter.get("/microbial-sfg/storage/grid", authenticate, getStorageGrid);
SfgStorageRouter.get("/microbial-sfg/storage/available-slots", authenticate, getAvailableSlots);
SfgStorageRouter.patch("/microbial-sfg/storage/containers/:id/inactive", authenticate, markContainerInactive);
SfgStorageRouter.patch("/microbial-sfg/storage/containers/:id/reactivate", authenticate, reactivateContainer);

export default SfgStorageRouter;
