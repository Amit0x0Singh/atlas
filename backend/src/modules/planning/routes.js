import express from "express";
import PlanEngineRouter from "./plan-engine/router.js";

const PlanningRouter = express.Router();
PlanningRouter.use("/", PlanEngineRouter);

export default PlanningRouter;
