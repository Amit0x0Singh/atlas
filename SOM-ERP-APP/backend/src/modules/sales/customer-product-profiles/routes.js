import { Router } from "express";
import { getCpProfiles, upsertManyCpProfiles } from "./cp-profiles.controller.js";

const router = Router();

router.get("/", getCpProfiles);
router.post("/upsert-many", upsertManyCpProfiles);

export default router;
