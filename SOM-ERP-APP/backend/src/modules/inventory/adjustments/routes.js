import express from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import {
  approveStockAdjustment,
  createStockAdjustment,
  listStockAdjustments,
  rejectStockAdjustment,
} from "../controllers/inventory/stock-adjustments-controller.js";
import {
  createWarehouseTransfer,
  listWarehouseTransfers,
  receiveWarehouseTransfer,
} from "../controllers/inventory/warehouse-transfers-controller.js";
import {
  createDecanting,
  listDecanting,
} from "../controllers/inventory/decanting-controller.js";
import {
  checkFifo,
  createFifoOverride,
} from "../controllers/inventory/fifo-controller.js";
import { getStockSummary } from "../controllers/inventory/stock-summary-controller.js";

const storeOrAbove = authorize(["store_person", "store_manager", "admin"]);
const managerOrAbove = authorize(["store_manager", "admin"]);

export default async function erpInventoryRoutes(fastify) {
  // Stock adjustments
  fastify.post(
    "/adjustments",
    { preHandler: storeOrAbove },
    createStockAdjustment,
  );
  fastify.patch(
    "/adjustments/:id/approve",
    { preHandler: managerOrAbove },
    approveStockAdjustment,
  );
  fastify.patch(
    "/adjustments/:id/reject",
    { preHandler: managerOrAbove },
    rejectStockAdjustment,
  );
  fastify.get(
    "/adjustments",
    { preHandler: storeOrAbove },
    listStockAdjustments,
  );

  // Warehouse transfers
  fastify.post(
    "/transfers",
    { preHandler: storeOrAbove },
    createWarehouseTransfer,
  );
  fastify.patch(
    "/transfers/:id/receive",
    { preHandler: storeOrAbove },
    receiveWarehouseTransfer,
  );
  fastify.get(
    "/transfers",
    { preHandler: storeOrAbove },
    listWarehouseTransfers,
  );

  // Decanting
  fastify.post("/decanting", { preHandler: storeOrAbove }, createDecanting);
  fastify.get("/decanting", { preHandler: storeOrAbove }, listDecanting);

  // FIFO
  fastify.post("/fifo-check", { preHandler: authenticate }, checkFifo);
  fastify.post(
    "/fifo-override",
    { preHandler: managerOrAbove },
    createFifoOverride,
  );

  // Stock overview
  fastify.get("/stock-summary", { preHandler: authenticate }, getStockSummary);
}
