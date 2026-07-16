/**
 * Master Data › Product Master › Create — Local Middleware
 * Validates POST /products.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateCreateProduct = preprocess({
  excludeFromConversion: ['productCode'],
  schema: {
    productCode: { required: true, minLength: 1, maxLength: 50 },
    productName: { required: true, minLength: 2, maxLength: 150 },
  },
})
