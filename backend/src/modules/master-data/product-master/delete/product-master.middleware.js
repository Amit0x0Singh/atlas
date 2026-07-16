/**
 * Master Data › Product Master › Delete — Local Middleware
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateProductCodeParam = preprocess({
  target: 'params',
  schema: {
    productCode: { required: true },
  },
})
