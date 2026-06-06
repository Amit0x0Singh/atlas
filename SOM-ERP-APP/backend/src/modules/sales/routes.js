import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import CustomerProfilesRouter  from "./customer-profiles/customer-profiles.controller.js";
// import CpProfilesRouter        from "./customer-product-profiles/cp-profiles.controller.js";
// import NotificationRouter      from "./notification/notification.controller.js";
// import TrackerRouter           from "./tracker/tracker.controller.js";
// import BomSendsRouter          from "./bom-sends/bom-sends.controller.js";
// import SalesOrderRouter        from "./sales-order/routes.js";
// import SalesOrderActionRouter  from "./sales-order-action/routes.js";
// import SalesOrderSyncRouter    from "./sales-order-sync/routes.js";

const SalesRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/customer-profiles/*         → customer-profiles
// /api/cp-profiles/*               → customer-product-profiles
// /api/tracker/*                   → tracker
// /api/bom-sends/*                 → bom-sends
// /api/erp/sales/*                 → sales-order / sales-order-action / sales-order-sync
// /api/erp/sales-orders/*          → sales-order (new ORM-based)
// /api/erp/notifications/*         → notification

export default SalesRouter;
