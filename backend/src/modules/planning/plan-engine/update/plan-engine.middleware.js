/**
 * Plan Engine › Update — Local Middleware
 * patchPlan is a flexible whitelist-PATCH (any subset of ~24 allowed
 * fields), several of which (shift, batchCode, noOfSp...) can legitimately
 * hold digit-only text ("1", "2") that must stay a string — the controller
 * already does its own explicit int/float parsing for the numeric-typed
 * fields in its allowlist. Running the generic type-converter here would
 * risk turning e.g. shift: "1" into the number 1 before the controller
 * ever sees it, breaking the write against a String column. So this is
 * sanitize-only (trim/collapse whitespace), no type conversion, no schema
 * — plus the shared :id param check.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { sanitizeBody } from '../../../../middleware/preprocessing/sanitize.js'

export const validatePlanIdParam = preprocess({
  target: 'params',
  schema: {
    id: { required: true },
  },
})

export const sanitizePatchPlan = sanitizeBody({})
