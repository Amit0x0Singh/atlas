/**
 * Equipment Master › Get — Local Middleware
 * Validates list-filter query params for GET /api/equipment. All filters are
 * optional — only checked for shape when actually present. page/limit are
 * parsed defensively in the controller itself, so they're not validated here.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateEquipmentListQuery = preprocess({
  target: 'query',
  schema: {
    equipCode: { maxLength: 50 },
    equipName: { maxLength: 150 },
    operation: { maxLength: 100 },
    plant:     { maxLength: 100 },
  },
})
