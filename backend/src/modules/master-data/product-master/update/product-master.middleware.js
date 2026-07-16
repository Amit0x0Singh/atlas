/**
 * Master Data › Product Master › Update — Local Middleware
 * Validates PUT /products/:productCode.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateUpdateProduct = preprocess({
  schema: {
    productName: { minLength: 2, maxLength: 150 },
  },
})

export const validateProductCodeParam = preprocess({
  target: 'params',
  schema: {
    productCode: { required: true },
  },
})
