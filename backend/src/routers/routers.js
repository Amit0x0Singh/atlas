import express from "express";

import UserRouter from "../modules/user/routes.js";
import InventoryRouter from "../modules/inventory/routes.js";
import SalesRouter from "../modules/sales/routes.js";
import ProductionRouter from "../modules/production/routes.js";
import PlanningRouter from "../modules/planning/routes.js";
import TasksRouter from "../modules/production/tasks/tasks.router.js";
import MasterDataRouter from "../modules/master-data/routes.js";
import MicrobialRouter from "../modules/microbial/routes.js";

// Admin Panel Router
import AdminPanelRouter from "../modules/admin_panel/router.js";

// Backup & Restore Router
import BackupRouter from "../modules/backup/router.js";

// Data Management (Delete) Router
import DataManagementRouter from "../modules/data-management/router.js";

// Admin Panel — Bulk Text Transformation Router
import BulkTransformRouter from "../modules/admin_panel/bulk-transform/router.js";

// RBAC management (roles/permissions/users) — thin service surface, not the
// Admin Panel UI. See modules/admin/rbac/router.js.
import RbacRouter from "../modules/admin/rbac/router.js";

// Audit Logs — read-only, admin.audit.view gated. See modules/admin/audit/router.js.
import AuditRouter from "../modules/admin/audit/router.js";

// Settings — Select Options Management Router
import OptionsAdminRouter from "../modules/options/admin-router.js";
import OptionsPublicRouter from "../modules/options/public-router.js";

import { authenticate, authorize } from "../middleware/auth.js";

const router = express.Router();

// ── Auth ──────────────────────────────────────────────────────────────────────
// Handles: /api/auth/* — POST /api/auth/login, GET /api/auth/me
router.use("/auth", UserRouter);

// ── Inventory ─────────────────────────────────────────────────────────────────

// Handles: /api/rm, /api/packs, /api/inward, /api/outward, /api/stock,
//          /api/ledger, /api/grn, /api/import, /api/bulk,
//          /api/gate, /api/inventory

router.use("/", InventoryRouter);


// ── Sales ─────────────────────────────────────────────────────────────────────
// Handles: /api/customer-profiles, /api/cp-profiles, /api/tracker,
//          /api/bom-sends, /api/sales, /api/sales-orders,
//          /api/notifications
router.use("/", SalesRouter);

// ── Production ────────────────────────────────────────────────────────────────
// Handles: /api/production, /api/indent, /api/sfg, /api/recipe,
//          /api/bom-issuance
router.use("/", ProductionRouter);

// ── Planning ──────────────────────────────────────────────────────────────────
// Handles: /api/plan-engine/*, /api/planning/*, /api/sales/planner-queue
router.use("/", PlanningRouter);

// ── Production Tasks (plant scheduling) ──────────────────────────────────────
// Handles: /api/production/tasks, /api/production/search/*
router.use("/", TasksRouter);

// ── Master Data ───────────────────────────────────────────────────────────────
// Handles: /api/rm, /api/products, /api/equipment, /api/masters/*
router.use("/", MasterDataRouter);

// ── Microbial ─────────────────────────────────────────────────────────────────
// Handles: /api/microbial-sfg/*, /api/microbial/*
router.use("/", MicrobialRouter);

// ── Select Options (public read) ─────────────────────────────────────────────
// Handles: /api/options/:groupCode — active values for one option group, for
// populating dropdowns app-wide. authenticate-only (no permission check)
// since every logged-in user's forms need to read these, not just admins.
router.use("/options", authenticate, OptionsPublicRouter);

// ---- RBAC management (roles/permissions/users) ────────────────────────────────
// Must precede /admin below — AdminPanelRouter's own /:resource catch-all
// would otherwise 404 "rbac" before this router is ever reached. Each route
// inside RbacRouter carries its own specific admin.users.*/admin.roles.*
// permission check, not one blanket gate here.
router.use("/admin/rbac", RbacRouter);

// ---- Audit Logs (read-only) ────────────────────────────────────────────────
// Same reason as RbacRouter above — must precede AdminPanelRouter's /:resource
// catch-all. Read-only; every route inside AuditRouter is gated by
// admin.audit.view (not the broader admin.panel.access the generic Admin
// Panel CRUD uses for the same underlying table).
router.use("/admin/audit", AuditRouter);

// ---- data management (delete) routes ─────────────────────────────────────────
// Must be registered before AdminPanelRouter for the same reason as
// /admin/backup below — its own /:resource catch-all would 404 this first.
router.use("/admin/data-management", authorize("admin.data-management.manage"), DataManagementRouter);

// ---- backup & restore routes ─────────────────────────────────────────────────
// Must be registered before AdminPanelRouter — its own /:resource catch-all
// would otherwise 404 "backup" before this router is ever reached.
router.use("/admin/backup", authorize("admin.backup.manage"), BackupRouter);

// ---- bulk text transformation routes ─────────────────────────────────────────
// Same reason as data-management/backup above — must precede AdminPanelRouter.
router.use("/admin/bulk-transform", authorize("admin.bulk-transform.manage"), BulkTransformRouter);

// ---- select options management routes ────────────────────────────────────────
// Same reason as data-management/backup/bulk-transform above — must precede
// AdminPanelRouter's own /:resource catch-all.
router.use("/admin/options", OptionsAdminRouter);

// ---- admin panel routes (not prefixed with /api) ──────────────────────────────
// Full raw CRUD (incl. delete-all-rows per resource) across every model.
// Reads need admin.panel.access; writes (POST/PUT/PATCH/DELETE) additionally
// need admin.panel.manage — see admin_panel/router.js for the per-method split.
router.use("/admin", AdminPanelRouter);

export default router;
