import express from "express";
import { authorize, authenticate } from "../../../../middleware/auth.js";
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
// Any logged-in user can look microbes up by name to power the autosuggest
// on Microbial Inward / Production's BOM issuance — a lookup needed to fill
// out a form they already have permission for, not a request to browse the
// Microbe Master screen. Must come before /:id or "search" would be read as
// a microbe id.
SfgMasterRouter.get("/microbial-sfg/masters/microbes/search", authenticate, listMicrobes);
SfgMasterRouter.get("/microbial-sfg/masters/microbes", canView, listMicrobes);
SfgMasterRouter.get("/microbial-sfg/masters/microbes/:id", canView, getMicrobe);
SfgMasterRouter.post("/microbial-sfg/masters/microbes", canCreate, createMicrobe);
SfgMasterRouter.put("/microbial-sfg/masters/microbes/:id", authorize("masters.microbe.update"), updateMicrobe);
SfgMasterRouter.delete("/microbial-sfg/masters/microbes/:id", authorize("masters.microbe.delete"), deleteMicrobe);

export default SfgMasterRouter;
