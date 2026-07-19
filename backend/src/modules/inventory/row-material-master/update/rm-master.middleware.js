/**
 * RM Master › Update — Local Middleware
 * Validates PUT /api/rm/:itemCode. uom's canonical-unit normalization stays
 * in the controller (business logic, not a generic concern).
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateUpdateRm = preprocess({
  lowercaseFields: ['itemName'],
  schema: {
    itemName:     { minLength: 2, maxLength: 150 },
    trackingType: { enum: ['PACK', 'BULK'] },
  },
})

export const validateItemCodeParam = preprocess({
  target: 'params',
  schema: {
    itemCode: { required: true },
  },
})
