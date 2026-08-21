/**
 * Production › Batch › Update — Local Middleware
 * Validates the 9 PATCH/PUT batch-stage routes. Every field here is
 * currently optional in the controller (each handler only sets a key when
 * it's present in req.body), so nothing is `required` — the goal is only to
 * reject malformed values before they reach parseFloat/parseInt and become
 * NaN in the database, matching the "optional but well-formed if provided"
 * rule every other schema in this codebase follows.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

// PATCH /production/:id — patchBatch
// currentStage is a fixed 7-stage workflow (the only values this codebase's
// own controllers ever write into it, see create/update/batch.controller.js
// and the ProductionBatch model's @default("BIOMASS")) — status is left
// unenumerated since only DRAFT/COMPLETED are ever produced today but this
// generic patch endpoint may be used for other transitions.
export const validatePatchBatch = preprocess({
  schema: {
    currentStage:     { enum: ['BIOMASS', 'TECHNICAL', 'FORMULATION', 'SIEVING', 'PACKING', 'QC', 'INVENTORY'] },
    temperature:      { number: true },      // can be negative
    humidity:         { nonNegative: true }, // a percentage — never negative
    biomassFlag:      { boolean: true },
    technicalFlag:    { boolean: true },
    formulationFlag:  { boolean: true },
    sievingFlag:      { boolean: true },
    packingFlag:      { boolean: true },
    qcFlag:           { boolean: true },
  },
})

// PUT /production/:id/biomass — saveBiomass
// `rows` entries feed straight into parseFloat for cfuPerGram/biomassQty/
// moisture — the array itself and its identity fields (cultureName etc.)
// are left alone since the controller already tolerates blanks there
// (flags the row instead of rejecting it).
export const validateSaveBiomass = preprocess({
  schema: {
    rows: { custom: (value) => (value !== undefined && !Array.isArray(value) ? ['rows must be an array'] : []) },
  },
})

// PUT /production/:id/technical — saveTechnical
export const validateSaveTechnical = preprocess({
  schema: {
    biomassQty:     { nonNegative: true },
    silicaQty:      { nonNegative: true },
    caco3Qty:       { nonNegative: true },
    mgStearateQty:  { nonNegative: true },
    smpQty:         { nonNegative: true },
    totalTechnicalQty: { nonNegative: true },
    qtyAfterSieving:   { nonNegative: true },
  },
})

// PUT /production/:id/formulation/:cycleId — updateFormulationCycle
export const validateUpdateFormulationCycle = preprocess({
  schema: {
    noOfWorkers: { positiveInt: true },
    sfgQtyUsed:  { nonNegative: true },
  },
})

// PUT /production/:id/unloading — saveUnloading
export const validateSaveUnloading = preprocess({
  schema: {
    weightAfter: { nonNegative: true },
    noOfWorkers: { positiveInt: true },
  },
})

// PUT /production/:id/sieving — saveSieving
export const validateSaveSieving = preprocess({
  schema: {
    noOfWorkers: { positiveInt: true },
  },
})

// PUT /production/:id/packing — savePacking
export const validateSavePacking = preprocess({
  schema: {
    weightPerUnit:      { nonNegative: true },
    totalUnitsPacked:   { positiveInt: true },
    totalQtyPacked:     { nonNegative: true },
    unitsPerBag:        { positiveInt: true },
    totalOuterPackages: { positiveInt: true },
    noOfCartons:        { positiveInt: true },
    noOfWorkers:        { positiveInt: true },
  },
})

// PUT /production/:id/qc — saveQc — no numeric fields, nothing to validate
// beyond what's already type-safe (booleans/strings), left unvalidated.

// PUT /production/:id/inventory — saveInventory
export const validateSaveInventory = preprocess({
  schema: {
    packedQty: { nonNegative: true },
  },
})
