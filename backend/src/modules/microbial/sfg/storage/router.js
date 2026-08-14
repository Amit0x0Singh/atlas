import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { getStorageGrid, getAvailableSlots } from "./get/sfg-storage.controller.js";
import { markContainerInactive, reactivateContainer } from "./update/sfg-storage.controller.js";

const SfgStorageRouter = express.Router();
const canView = authorize("microbial.sfg-storage.view");

SfgStorageRouter.get("/microbial-sfg/storage/grid", canView, getStorageGrid);
SfgStorageRouter.get("/microbial-sfg/storage/available-slots", canView, getAvailableSlots);
SfgStorageRouter.patch("/microbial-sfg/storage/containers/:id/inactive", authorize("microbial.sfg-storage.update"), markContainerInactive);
SfgStorageRouter.patch("/microbial-sfg/storage/containers/:id/reactivate", authorize("microbial.sfg-storage.update"), reactivateContainer);

export default SfgStorageRouter;
