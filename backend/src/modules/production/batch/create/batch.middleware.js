/**
 * Production › Batch › Create — Local Middleware
 * Validates POST /production and POST /production/:id/formulation.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

// POST /production — createBatch
// indentId is the only field the controller hard-requires (explicit 400 if
// missing). temperature/humidity are optional but get parseFloat'd straight
// into the DB if present, so they must be well-formed numbers when given.
export const validateCreateBatch = preprocess({
  schema: {
    indentId:    { required: true },
    temperature: { number: true },       // can be negative — not `positive`/`nonNegative`
    humidity:    { nonNegative: true },   // a percentage — never negative
  },
})

// POST /production/:id/formulation — addFormulationCycle
// Nothing here is currently mandatory (controller falls back to '' / null /
// false for every field and only sets a `flagged` warning), so nothing is
// `required`. noOfWorkers/sfgQtyUsed get parseInt/parseFloat'd if present.
export const validateAddFormulationCycle = preprocess({
  schema: {
    noOfWorkers: { positiveInt: true },
    sfgQtyUsed:  { nonNegative: true },
  },
})
