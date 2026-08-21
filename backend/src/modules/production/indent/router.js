import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { requirePlantInScope, requireRecordPlantInScope } from "../../../middleware/scope.js";
import { stockCheck, getNextBatchNo, getSfgAvailable, listProducts, getPurchaseSummary, getIndent, listIndents } from "./get/indent.controller.js";
import { createIndent, markPoSent } from "./create/indent.controller.js";
import { validateCreateIndent, validateMarkPoSent } from "./create/indent.middleware.js";

const IndentRouter = express.Router();
const canView   = authorize("production.indent.view");
const canCreate = authorize("production.indent.create");
const scopedById = requireRecordPlantInScope({ model: "indentMaster", idParam: "indentId", plantField: "plant" });

IndentRouter.get("/indent/stock-check", canView, stockCheck);
IndentRouter.get("/indent/next-batch-no", canView, getNextBatchNo);
IndentRouter.get("/indent/sfg-available", canView, getSfgAvailable);
IndentRouter.get("/indent/products/list", canView, listProducts);
IndentRouter.get("/indent/purchase-summary", canView, getPurchaseSummary);
IndentRouter.post("/indent/mark-po-sent", authorize("production.indent.update"), validateMarkPoSent, markPoSent);
IndentRouter.get("/indent/:indentId", canView, scopedById, getIndent);
IndentRouter.get("/indent", canView, listIndents);
IndentRouter.post("/indent", canCreate, requirePlantInScope("plant"), validateCreateIndent, createIndent);

export default IndentRouter;
