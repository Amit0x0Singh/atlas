import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import ExportController from "./export.controller.js";

const ExportRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/erp/export/sales-orders
// /api/erp/export/at-risk-orders
// /api/erp/export/dispatch-summary
// /api/erp/export/sales-performance
// /api/erp/export/microbial-stock
// /api/erp/export/cfu-decay
// /api/erp/export/microbial-transactions
// /api/erp/export/demand-stock-gap
// /api/erp/export/production-schedule
// /api/erp/export/time-motion
// /api/erp/export/equipment-utilisation
// /api/erp/export/rm-forecast
// /api/erp/export/management-pack
// /api/erp/export/gate-inward-log

export default ExportRouter;
