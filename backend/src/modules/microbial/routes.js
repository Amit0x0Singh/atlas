import express from "express";
import ErpMicrobialRouter from "./erp-microbial/router.js";
import SfgMasterRouter from "./sfg/master/router.js";
import SfgInwardRouter from "./sfg/inward/router.js";
import SfgPlanningRouter from "./sfg/planning/router.js";
import SfgOutwardRouter from "./sfg/outward/router.js";
import SfgAdjustmentRouter from "./sfg/adjustment/router.js";
import SfgDashboardRouter from "./sfg/dashboard/router.js";
import SfgStorageRouter from "./sfg/storage/router.js";
import SfgStockSummaryRouter from "./sfg/stock-summary/router.js";

const MicrobialRouter = express.Router();
MicrobialRouter.use("/", ErpMicrobialRouter);
MicrobialRouter.use("/", SfgMasterRouter);
MicrobialRouter.use("/", SfgInwardRouter);
MicrobialRouter.use("/", SfgPlanningRouter);
MicrobialRouter.use("/", SfgOutwardRouter);
MicrobialRouter.use("/", SfgAdjustmentRouter);
MicrobialRouter.use("/", SfgDashboardRouter);
MicrobialRouter.use("/", SfgStorageRouter);
MicrobialRouter.use("/", SfgStockSummaryRouter);

export default MicrobialRouter;
