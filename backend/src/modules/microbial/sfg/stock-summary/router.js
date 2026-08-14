import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { getMicrobeWiseStockSummary, getContainerLedger } from "./get/sfg-stock-summary.controller.js";

const SfgStockSummaryRouter = express.Router();
// Shares the dashboard's view permission — same reporting surface, not
// worth a dedicated permission for two read-only endpoints.
const canView = authorize("microbial.sfg-dashboard.view");

SfgStockSummaryRouter.get("/microbial-sfg/stock-summary/microbe-wise", canView, getMicrobeWiseStockSummary);
SfgStockSummaryRouter.get("/microbial-sfg/stock-summary/container-ledger", canView, getContainerLedger);

export default SfgStockSummaryRouter;
