/**
 * Master Data › Product Master › Create — Local Middleware
 * Validates POST /products.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateCreateProduct = preprocess({
  schema: {
    productName: { required: true, minLength: 2, maxLength: 150 },
    state:       { enum: ['SOLID', 'LIQUID', 'GAS'] },
  },
})
