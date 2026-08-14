import { Router } from "express";
import { authorize } from "../../../middleware/auth.js";
import { listTrackerIndents, getTrackerDetail } from "./get/tracker.controller.js";

const router = Router();

router.get("/", authorize("sales.tracker.view"), listTrackerIndents);
router.get("/detail", authorize("sales.tracker.view"), getTrackerDetail);

export default router;
