import express from "express";
import { authorize } from "../../../middleware/auth.js";
import { listBatches, getBatch } from "./get/batch.controller.js";
import { createBatch, addFormulationCycle } from "./create/batch.controller.js";
import { validateCreateBatch, validateAddFormulationCycle } from "./create/batch.middleware.js";
import { patchBatch, saveBiomass, saveTechnical, updateFormulationCycle, saveUnloading, saveSieving, savePacking, saveQc, saveInventory } from "./update/batch.controller.js";
import { validatePatchBatch, validateSaveBiomass, validateSaveTechnical, validateUpdateFormulationCycle, validateSaveUnloading, validateSaveSieving, validateSavePacking, validateSaveInventory } from "./update/batch.middleware.js";
import { deleteFormulationCycle } from "./delete/batch.controller.js";

const BatchRouter = express.Router();
const canView   = authorize("production.batch.view");
const canCreate = authorize("production.batch.create");
const canUpdate = authorize("production.batch.update");

BatchRouter.get("/production", canView, listBatches);
BatchRouter.post("/production", canCreate, validateCreateBatch, createBatch);
BatchRouter.get("/production/:id", canView, getBatch);
BatchRouter.patch("/production/:id", canUpdate, validatePatchBatch, patchBatch);
BatchRouter.put("/production/:id/biomass", canUpdate, validateSaveBiomass, saveBiomass);
BatchRouter.put("/production/:id/technical", canUpdate, validateSaveTechnical, saveTechnical);
BatchRouter.post("/production/:id/formulation", canCreate, validateAddFormulationCycle, addFormulationCycle);
BatchRouter.put("/production/:id/formulation/:cycleId", canUpdate, validateUpdateFormulationCycle, updateFormulationCycle);
BatchRouter.delete("/production/:id/formulation/:cycleId", authorize("production.batch.delete"), deleteFormulationCycle);
BatchRouter.put("/production/:id/unloading", canUpdate, validateSaveUnloading, saveUnloading);
BatchRouter.put("/production/:id/sieving", canUpdate, validateSaveSieving, saveSieving);
BatchRouter.put("/production/:id/packing", canUpdate, validateSavePacking, savePacking);
BatchRouter.put("/production/:id/qc", canUpdate, saveQc);
BatchRouter.put("/production/:id/inventory", canUpdate, validateSaveInventory, saveInventory);

export default BatchRouter;
