import express from "express";
import { authorize } from "../../../../middleware/auth.js";
import { listMicrobes, getMicrobe } from "./get/sfg-master.controller.js";
import { migrateTables, createMicrobe, importMicrobes } from "./create/sfg-master.controller.js";
import { updateMicrobe } from "./update/sfg-master.controller.js";
import { deleteMicrobe } from "./delete/sfg-master.controller.js";

// Operates on MicrobeMaster — same resource as masters.microbe.* (Masters
// module), just this screen's own CRUD surface for it.
const SfgMasterRouter = express.Router();
const canView   = authorize("masters.microbe.view");
const canCreate = authorize("masters.microbe.create"); // migrate/import are bulk-create operations

SfgMasterRouter.post("/microbial-sfg/masters/migrate", canCreate, migrateTables);
SfgMasterRouter.post("/microbial-sfg/masters/microbes/import", canCreate, importMicrobes);
SfgMasterRouter.get("/microbial-sfg/masters/microbes", canView, listMicrobes);
SfgMasterRouter.get("/microbial-sfg/masters/microbes/:id", canView, getMicrobe);
SfgMasterRouter.post("/microbial-sfg/masters/microbes", canCreate, createMicrobe);
SfgMasterRouter.put("/microbial-sfg/masters/microbes/:id", authorize("masters.microbe.update"), updateMicrobe);
SfgMasterRouter.delete("/microbial-sfg/masters/microbes/:id", authorize("masters.microbe.delete"), deleteMicrobe);

export default SfgMasterRouter;
