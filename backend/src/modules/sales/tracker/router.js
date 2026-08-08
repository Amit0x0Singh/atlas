import { Router } from "express";
import { authenticate } from "../../../middleware/auth.js";
import { listTrackerIndents, getTrackerDetail } from "./get/tracker.controller.js";

const router = Router();
router.use(authenticate);

router.get("/", listTrackerIndents);
router.get("/detail", getTrackerDetail);

export default router;
