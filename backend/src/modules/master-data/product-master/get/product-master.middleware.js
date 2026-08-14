/**
 * Product Master › Get — Local Middleware
 * Validates list-filter query params for GET /api/products. All filters are
 * optional — only checked for shape when actually present. page/limit are
 * parsed defensively in the controller itself, so they're not validated here.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateProductListQuery = preprocess({
  target: 'query',
  schema: {
    productCode: { maxLength: 50 },
    productName: { maxLength: 150 },
    plant:       { maxLength: 100 },
    uom:         { maxLength: 20 },
    state:       { enum: ['SOLID', 'LIQUID', 'GAS'] },
  },
})
