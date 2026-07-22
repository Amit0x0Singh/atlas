import express from "express";
import { authenticate } from "../../../../middleware/auth.js";
import { getMicrobeWiseStockSummary, getContainerLedger } from "./get/sfg-stock-summary.controller.js";

const SfgStockSummaryRouter = express.Router();

SfgStockSummaryRouter.get("/microbial-sfg/stock-summary/microbe-wise", authenticate, getMicrobeWiseStockSummary);
SfgStockSummaryRouter.get("/microbial-sfg/stock-summary/container-ledger", authenticate, getContainerLedger);

export default SfgStockSummaryRouter;
