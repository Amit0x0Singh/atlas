/**
 * Master Data › Packing Master › Delete — Local Middleware
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validatePackingIdParam = preprocess({
  target: 'params',
  schema: { id: { required: true } },
})
