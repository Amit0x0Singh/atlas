import { Router } from "express";
import { authorize } from "../../../middleware/auth.js";
import { validateCreateSalesOrder, validateUpdateSalesOrder } from "./create/sales-order.middleware.js";

import {
  createSalesOrder,
  addCompany,
} from "./create/sales-order.controller.js";

import {
  deleteSalesOrder,
  deleteSalesOrderItem,
} from "./delete/sales-order.controller.js";

import {
  getSalesOrders,
  getSalesOrderById,
  getDashboardSummary,
  getSyncLogs,
  getCompanies,
} from "./get/sales-order.controller.js";

import {
  updateSalesOrder,
  updateSalesOrderItem,
  cancelOrder,
  dispatchOrder,
} from "./update/sales-order.controller.js";

// ____________------ Router -----------------------

const router = Router();
const canView   = authorize("sales.order.view");
const canCreate = authorize("sales.order.create");
const canUpdate = authorize("sales.order.update");

// Static paths must come before /:id

router.post("/", canCreate, validateCreateSalesOrder, createSalesOrder);
router.post("/companies", canCreate, addCompany);

router.get("/", canView, getSalesOrders);
router.get("/summary/dashboard", canView, getDashboardSummary);
router.get("/sync-log", canView, getSyncLogs);
router.get("/companies", canView, getCompanies);
router.get("/:id", canView, getSalesOrderById);

router.put("/:id", canUpdate, validateUpdateSalesOrder, updateSalesOrder);

router.patch("/item/:itemId", canUpdate, updateSalesOrderItem);
router.patch("/cancel/:id", authorize("sales.order.cancel"), cancelOrder);
router.patch("/dispatch/:id", authorize("sales.order.dispatch"), dispatchOrder);

router.delete("/item/:itemId", authorize("sales.order.delete"), deleteSalesOrderItem);
router.delete("/:id", authorize("sales.order.delete"), deleteSalesOrder);

export default router;
