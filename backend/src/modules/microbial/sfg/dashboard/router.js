import express from "express";
import { authenticate } from "../../../../middleware/auth.js";
import { getExecDashboard } from "./get/sfg-dashboard.controller.js";

const SfgDashboardRouter = express.Router();

SfgDashboardRouter.get("/microbial-sfg/dashboard", authenticate, getExecDashboard);

export default SfgDashboardRouter;
