import { Router } from "express";
import {
  listSalesOrders,
  getDashboardSummary,
  getSyncLog,
  getCompanies,
  getSalesOrderById,
  createSalesOrder,
  addCompany,
  sheetImport,
  updateSalesOrder,
  patchDispatch,
  updateSalesOrderItem,
  deleteSalesOrder,
  deleteSalesOrderItem,
} from "./sales-order.controller.js";

const router = Router();

// Static paths must come before /:id
router.get("/summary/dashboard", getDashboardSummary);
router.get("/sync-log", getSyncLog);
router.get("/companies", getCompanies);
router.get("/", listSalesOrders);
router.get("/:id", getSalesOrderById);

router.post("/companies", addCompany);
router.post("/sheet-import", sheetImport);
router.post("/", createSalesOrder);

router.put("/:id", updateSalesOrder);

router.patch("/dispatch/:id", patchDispatch);
router.patch("/item/:itemId", updateSalesOrderItem);

router.delete("/item/:itemId", deleteSalesOrderItem);
router.delete("/:id", deleteSalesOrder);

export default router;
