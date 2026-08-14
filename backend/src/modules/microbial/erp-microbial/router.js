import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { listContainers, getContainer, listTransactions, getDecayReport } from "./get/microbial.controller.js";
import { createContainer, allocateCfu, createTransaction } from "./create/microbial.controller.js";
import { patchContainer, confirmReceipt } from "./update/microbial.controller.js";

const ErpMicrobialRouter = express.Router();
const canViewContainer = authorize("microbial.erp-container.view");
const canViewTx = authorize("microbial.erp-transaction.view");

ErpMicrobialRouter.get("/microbial/containers", canViewContainer, listContainers);
ErpMicrobialRouter.get("/microbial/containers/:id", canViewContainer, getContainer);
ErpMicrobialRouter.post("/microbial/containers", authorize("microbial.erp-container.create"), createContainer);
ErpMicrobialRouter.patch("/microbial/containers/:id", authorize("microbial.erp-container.update"), patchContainer);
ErpMicrobialRouter.post("/microbial/allocate", authorize("microbial.erp-container.allocate"), allocateCfu);
ErpMicrobialRouter.get("/microbial/transactions", canViewTx, listTransactions);
ErpMicrobialRouter.post("/microbial/transactions", authorize("microbial.erp-transaction.create"), createTransaction);
ErpMicrobialRouter.patch("/microbial/transactions/:id/confirm-receipt", authorize("microbial.erp-transaction.update"), confirmReceipt);
ErpMicrobialRouter.get("/microbial/decay-report", canViewTx, getDecayReport);

export default ErpMicrobialRouter;
