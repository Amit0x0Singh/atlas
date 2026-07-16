/**
 * Bulk Location › Create — Local Middleware
 * Validates POST /bulk-location/locations, /inward, /outward. uom's
 * canonical-unit normalization stays in the controller (business logic).
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateCreateLocation = preprocess({
  excludeFromConversion: ['locationId', 'itemCode'],
  schema: {
    locationId:   { required: true, minLength: 1, maxLength: 50 },
    locationName: { required: true, minLength: 2, maxLength: 150 },
    itemCode:     { required: true },
    itemName:     { required: true, minLength: 2 },
  },
})

export const validateBulkInward = preprocess({
  excludeFromConversion: ['locationId', 'invoiceNo'],
  schema: {
    locationId:  { required: true },
    receivedQty: { required: true, positive: true },
  },
})

export const validateBulkOutward = preprocess({
  schema: {
    lotEntryId: { required: true },
    qtyToIssue: { required: true, positive: true },
  },
})
