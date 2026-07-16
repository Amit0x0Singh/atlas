/**
 * Containers › Create — Local Middleware
 * Validates POST / (create), POST /:containerId/fill, POST /:containerId/issue.
 * uom canonical conversion (toCanonical) stays in the controller.
 */
import { preprocess } from '../../../../../middleware/preprocessing/index.js'

export const validateCreateContainer = preprocess({
  schema: {
    itemCode: { required: true },
    itemName: { required: true, minLength: 2 },
    capacity: { required: true, positive: true },
    uom:      { required: true },
  },
})

export const validateFillContainer = preprocess({
  schema: {
    packId: { required: true },
    qty:    { required: true, positive: true },
  },
})

export const validateIssueFromContainer = preprocess({
  schema: {
    qty: { required: true, positive: true },
  },
})
