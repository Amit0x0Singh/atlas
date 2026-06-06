import express from "express";

import UserRouter       from "../modules/user/routes.js";
import InventoryRouter  from "../modules/inventory/routes.js";
import SalesRouter      from "../modules/sales/routes.js";
import ProductionRouter from "../modules/production/routes.js";
import PlanningRouter   from "../modules/planning/routes.js";
import MasterDataRouter from "../modules/master-data/routes.js";
import HRRouter         from "../modules/hr/routes.js";
import MicrobialRouter  from "../modules/microbial/routes.js";
import ExportRouter     from "../modules/export/routes.js";

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
// Handles: /api/auth/*
router.use("/auth", UserRouter);

// ── Inventory ─────────────────────────────────────────────────────────────────
// Handles: /api/rm, /api/packs, /api/inward, /api/outward, /api/stock,
//          /api/ledger, /api/grn, /api/import, /api/bulk,
//          /api/erp/gate, /api/erp/inventory
router.use("/", InventoryRouter);

// ── Sales ─────────────────────────────────────────────────────────────────────
// Handles: /api/customer-profiles, /api/cp-profiles, /api/tracker,
//          /api/bom-sends, /api/erp/sales, /api/erp/sales-orders,
//          /api/erp/notifications
router.use("/", SalesRouter);

// ── Production ────────────────────────────────────────────────────────────────
// Handles: /api/production, /api/indent, /api/sfg, /api/recipe,
//          /api/erp/bom-issuance
router.use("/", ProductionRouter);

// ── Planning ──────────────────────────────────────────────────────────────────
// Handles: /api/erp/planning, /api/erp/plan-engine
router.use("/erp", PlanningRouter);

// ── Master Data ───────────────────────────────────────────────────────────────
// Handles: /api/products, /api/equipment, /api/erp/masters
router.use("/", MasterDataRouter);

// ── HR ────────────────────────────────────────────────────────────────────────
// Handles: /api/erp/employees
router.use("/erp", HRRouter);

// ── Microbial ─────────────────────────────────────────────────────────────────
// Handles: /api/microbial-sfg, /api/erp/microbial
router.use("/", MicrobialRouter);

// ── Export ────────────────────────────────────────────────────────────────────
// Handles: /api/erp/export
router.use("/erp", ExportRouter);

export default router;
