import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import ErpMastersRouter    from "./erp-masters/erp-masters.controller.js";
// import ProductMasterRouter from "./product-master/product-master.controller.js";
// import EquipmentRouter     from "./equipment-master/equipment-master.controller.js";
// import RmMasterRouter      from "./rm-master.js";

const MasterDataRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/products/*              → product-master
// /api/equipment/*             → equipment-master
// /api/erp/masters/items/*     → erp-masters
// /api/erp/masters/suppliers/* → erp-masters
// /api/erp/masters/plants/*    → erp-masters
// /api/erp/masters/equipment/* → erp-masters
// /api/erp/masters/bom/*       → erp-masters
// /api/erp/masters/strains/*   → erp-masters
// /api/erp/masters/customers/* → erp-masters

export default MasterDataRouter;
