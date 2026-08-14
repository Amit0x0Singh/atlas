import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { getExecDashboard } from "./get/sfg-dashboard.controller.js";

const SfgDashboardRouter = express.Router();

SfgDashboardRouter.get("/microbial-sfg/dashboard", authorize("microbial.sfg-dashboard.view"), getExecDashboard);

export default SfgDashboardRouter;
