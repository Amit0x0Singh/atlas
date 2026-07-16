/**
 * Master Data › Packing Master › Update — Local Middleware
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateUpdatePackingMaterial = preprocess()

export const validatePackingIdParam = preprocess({
  target: 'params',
  schema: { id: { required: true } },
})
