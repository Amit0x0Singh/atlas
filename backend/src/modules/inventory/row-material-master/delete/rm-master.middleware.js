/**
 * RM Master › Delete — Local Middleware
 * Validates the :itemCode route param for DELETE /api/rm/:itemCode.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateItemCodeParam = preprocess({
  target: 'params',
  schema: {
    itemCode: { required: true },
  },
})
