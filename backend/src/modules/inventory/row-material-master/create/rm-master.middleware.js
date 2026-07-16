/**
 * RM Master › Create — Local Middleware
 * Sanitizes, type-converts, and validates POST /api/rm request bodies
 * before they reach the controller. Built from the global preprocessing
 * pipeline — see middleware/preprocessing/index.js.
 *
 * uom's canonical-unit normalization (normalizeUom / CANONICAL_UNITS) stays
 * in the controller — that's domain-specific business logic, not a generic
 * sanitize/validate concern.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateCreateRm = preprocess({
  excludeFromConversion: ['itemCode'],
  schema: {
    itemCode:     { required: true, minLength: 1, maxLength: 50 },
    itemName:     { required: true, minLength: 2, maxLength: 150 },
    uom:          { required: true },
    trackingType: { enum: ['PACK', 'BULK'] },
  },
})
