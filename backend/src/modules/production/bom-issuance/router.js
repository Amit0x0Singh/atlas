import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { listPendingJobs, getJob, listHistory } from "./get/bom-issuance.controller.js";
import { issueItem, scrapBatch, reprocessBatch } from "./create/bom-issuance.controller.js";

const BomIssuanceRouter = express.Router();
const canView   = authorize("production.bom-issuance.view");
const canCreate = authorize("production.bom-issuance.create");

BomIssuanceRouter.get("/bom-issuance/pending-jobs", canView, listPendingJobs);
BomIssuanceRouter.get("/bom-issuance/history", canView, listHistory);
BomIssuanceRouter.get("/bom-issuance/job/:jobId", canView, getJob);
BomIssuanceRouter.post("/bom-issuance/issue", canCreate, issueItem);
BomIssuanceRouter.post("/bom-issuance/jobs/:id/scrap", canCreate, scrapBatch);
BomIssuanceRouter.post("/bom-issuance/jobs/:id/reprocess", authorize("production.bom-issuance.reprocess"), reprocessBatch);

export default BomIssuanceRouter;
