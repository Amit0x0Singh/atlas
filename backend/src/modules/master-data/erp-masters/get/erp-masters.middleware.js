/**
 * ERP Masters › Get — Local Middleware
 * Validates list-filter query params. All filters are optional — only
 * checked for shape when actually present. page/limit are parsed
 * defensively in the controller itself, so they're not validated here.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateSupplierListQuery = preprocess({
  target: 'query',
  excludeFromConversion: ['gstin', 'phone'],
  schema: {
    supplier_name: { maxLength: 150 },
    phone:         { maxLength: 20 },
    email:         { maxLength: 200 },
    gstin:         { maxLength: 20 },
    address:       { maxLength: 300 },
  },
})
