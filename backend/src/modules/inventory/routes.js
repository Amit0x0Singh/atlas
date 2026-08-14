import express from "express";
import GateRouter from "./gate/router.js";
import RmRouter from "./row-material-master/router.js";
import StockRouter from "./stock/router.js";
import LedgerRouter from "./ledger/router.js";
import GrnRouter from "./grn/router.js";
import InwardRouter from "./store/inward/router.js";
import OutwardRouter from "./store/outward/router.js";
import ContainersRouter from "./store/containers/router.js";
import ImportRouter from "./import/router.js";

const InventoryRouter = express.Router();

// ── RM Master ─────────────────────────────────────────────────────────────────
InventoryRouter.use("/rm", RmRouter);

// ── Stock ─────────────────────────────────────────────────────────────────────
InventoryRouter.use("/stock", StockRouter);

// ── Ledger ────────────────────────────────────────────────────────────────────
InventoryRouter.use("/ledger", LedgerRouter);

// ── GRN ───────────────────────────────────────────────────────────────────────
InventoryRouter.use("/grn", GrnRouter);

// ── Inward (packs + sessions) ────────────────────────────────────────────────
InventoryRouter.use("/", InwardRouter);

// ── Outward ───────────────────────────────────────────────────────────────────
InventoryRouter.use("/outward", OutwardRouter);

// ── Containers ────────────────────────────────────────────────────────────────
InventoryRouter.use("/containers", ContainersRouter);

// ── Import ────────────────────────────────────────────────────────────────────
InventoryRouter.use("/import", ImportRouter);  

// ── Gate (Inward + Outward) ───────────────────────────────────────────────────
InventoryRouter.use("/gate", GateRouter);    // review completed

export default InventoryRouter;
