import { Router } from "express";
import {
  getCustomerProfiles,
  upsertCustomerProfile,
  seedCustomerProfiles,
} from "./customer-profiles.controller.js";

const router = Router();

router.get("/", getCustomerProfiles);
router.post("/upsert", upsertCustomerProfile);
router.post("/seed", seedCustomerProfiles);

export default router;
