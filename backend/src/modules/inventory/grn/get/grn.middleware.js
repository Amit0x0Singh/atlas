/**
 * GRN › Get — Local Middleware
 * Validates GET /grn/detail query params.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateGrnDetailQuery = preprocess({
  target: 'query',
  excludeFromConversion: ['invoiceNo'],
  schema: {
    invoiceNo: { required: true },
  },
})
