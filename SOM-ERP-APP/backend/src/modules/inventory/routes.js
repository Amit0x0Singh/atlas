import express from "express";

// ── Sub-routers (to be wired after Fastify → Express migration) ───────────────
// import GateRouter       from "./gate/gate.controller.js";
// import BulkRouter       from "./bulk-location/bulk-location.controller.js";
// import StockRouter      from "./stock/stock.controller.js";
// import LedgerRouter     from "./ledger/ledger.controller.js";
// import GrnRouter        from "./grn/grn.controller.js";
// import ImportRouter     from "./import/import.controller.js";
// import AdjRouter        from "./adjustments/adjustments.controller.js";
// import InwardRouter     from "./store/inward/inward.controller.js";
// import OutwardRouter    from "./store/outward/outward.controller.js";
// import PrintMasterRouter from "./store/print-master/print-master.controller.js";
// import RmMasterRouter   from "./row-material-master/rm-master.controller.js";

const InventoryRouter = express.Router();

// ── API paths handled by this module ─────────────────────────────────────────
// /api/rm/*                    → row-material-master
// /api/packs/*                 → store/print-master
// /api/inward/*                → store/inward
// /api/outward/*               → store/outward
// /api/stock/*                 → stock
// /api/ledger/*                → ledger
// /api/grn/*                   → grn
// /api/import/*                → import
// /api/bulk/*                  → bulk-location
// /api/erp/gate/*              → gate
// /api/erp/inventory/*         → adjustments

export default InventoryRouter;
