/**
 * Global Request Preprocessing Pipeline — single entry point
 * ─────────────────────────────────────────────────────────────────────────────
 * Composes the three stages in the fixed order every route needs them in:
 *
 *   Request -> Sanitize -> Type-Convert -> Validate -> Controller -> Database
 *
 * This is the "global middleware" local middleware files are meant to call —
 * each route supplies its own field config + validation schema, and gets
 * back a ready-to-mount Express middleware chain. Nothing here is route- or
 * module-specific, so it works the same way for Inventory, Production,
 * Planning, or Master Data endpoints.
 *
 * Usage in local middleware (e.g. inventory/gate/create/gate.middleware.js):
 *   import { preprocess } from '../../../../middleware/preprocessing/index.js'
 *
 *   export const validateGateInward = preprocess({
 *     excludeFromConversion: ['invoice_no', 'vehicle_no'],
 *     schema: {
 *       supplier_name: { required: true, minLength: 2, maxLength: 150 },
 *       company:       { required: true, enum: VALID_COMPANIES },
 *     },
 *   })
 *
 *   // router.js
 *   GateRouter.post('/inward', gateOrAbove, validateGateInward, createGateInward)
 */
import { sanitizeBody } from './sanitize.js'
import { convertTypes } from './typeConvert.js'
import { validate } from './validate.js'

export function preprocess({
  target = 'body',
  lowercaseFields = [],
  excludeFromConversion = [],
  identifierPatterns,
  schema = null,
} = {}) {
  const chain = [
    sanitizeBody({ target, lowercaseFields }),
    convertTypes({ target, excludeFields: excludeFromConversion, identifierPatterns }),
  ]
  if (schema) chain.push(validate(schema, { target }))
  // Express accepts an array of middlewares as a single router argument —
  // local middleware files export this directly and pass it straight to
  // router.post/get/etc alongside their other middleware.
  return chain
}

export { sanitizeBody, convertTypes, validate }
