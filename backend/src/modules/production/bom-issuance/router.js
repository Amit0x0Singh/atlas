import express from "express";
import { authenticate, authorize } from "../../../middleware/auth.js";
import { listPendingJobs, getJob, listHistory } from "./get/bom-issuance.controller.js";
import { issueItem, scrapBatch, reprocessBatch } from "./create/bom-issuance.controller.js";

const BomIssuanceRouter = express.Router();
const managerOrAbove = authorize(["store_manager", "admin"]);
const storeOrAbove = authorize(["store_person", "store_manager", "admin"]);

BomIssuanceRouter.get("/bom-issuance/pending-jobs", authenticate, storeOrAbove, listPendingJobs);
BomIssuanceRouter.get("/bom-issuance/history", authenticate, storeOrAbove, listHistory);
BomIssuanceRouter.get("/bom-issuance/job/:jobId", authenticate, storeOrAbove, getJob);
BomIssuanceRouter.post("/bom-issuance/issue", authenticate, storeOrAbove, issueItem);
BomIssuanceRouter.post("/bom-issuance/jobs/:id/scrap", authenticate, storeOrAbove, scrapBatch);
BomIssuanceRouter.post("/bom-issuance/jobs/:id/reprocess", authenticate, managerOrAbove, reprocessBatch);

export default BomIssuanceRouter;
