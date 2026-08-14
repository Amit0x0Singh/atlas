import { Router } from "express";
import { authorize } from "../../../middleware/auth.js";
import {
  getCustomerProfiles,
  getCpProfiles,
} from "./get/customer-profile.controller.js";
import { upsertCustomerProfile } from "./update/customer-profile.controller.js";
import {
  seedCustomerProfiles,
  upsertManyCpProfiles,
} from "./create/cp-profiles.controller.js";

const router = Router();

router.get("/", authorize("sales.customer-profile.view"), getCustomerProfiles);
router.get("/cp-profiles", authorize("sales.customer-profile.view"), getCpProfiles);

router.post("/upsert", authorize("sales.customer-profile.update"), upsertCustomerProfile);
router.post("/upsert-many", authorize("sales.customer-profile.create"), upsertManyCpProfiles);
router.post("/seed", authorize("sales.customer-profile.create"), seedCustomerProfiles);

export default router;
