import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { createStockAdjustment, approveStockAdjustment, rejectStockAdjustment, listStockAdjustments } from "./stock-adjustments/stock-adjustments-controller.js";
import { createWarehouseTransfer, receiveWarehouseTransfer, listWarehouseTransfers } from "./warehouse-transfers/warehouse-transfers-controller.js";
import { createDecanting, listDecanting } from "./decanting/decanting.controller.js";
import { checkFifo, createFifoOverride } from "./fifo/fifo.controller.js";
import { getStockSummary } from "./stock-summary/stock-summary.controller.js";

const router = express.Router();

// Stock adjustments — approve/reject are a separate permission from create,
// so a Store Viewer/Executive-equivalent role can raise an adjustment but
// never self-approve it.
router.post("/adjustments", authorize("inventory.adjustment.create"), createStockAdjustment);
router.patch("/adjustments/:id/approve", authorize("inventory.adjustment.approve"), approveStockAdjustment);
router.patch("/adjustments/:id/reject", authorize("inventory.adjustment.reject"), rejectStockAdjustment);
router.get("/adjustments", authorize("inventory.adjustment.view"), listStockAdjustments);

// Warehouse transfers
router.post("/transfers", authorize("inventory.transfer.create"), createWarehouseTransfer);
router.patch("/transfers/:id/receive", authorize("inventory.transfer.receive"), receiveWarehouseTransfer);
router.get("/transfers", authorize("inventory.transfer.view"), listWarehouseTransfers);

// Decanting
router.post("/decanting", authorize("inventory.decanting.create"), createDecanting);
router.get("/decanting", authorize("inventory.decanting.view"), listDecanting);

// FIFO
router.post("/fifo-check", authorize("inventory.fifo.check"), checkFifo);
router.post("/fifo-override", authorize("inventory.fifo.override"), createFifoOverride);

// Stock overview
router.get("/stock-summary", authorize("inventory.stock.view"), getStockSummary);

export default router;
