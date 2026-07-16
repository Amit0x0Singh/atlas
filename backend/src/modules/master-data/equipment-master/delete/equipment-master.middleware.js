/**
 * Master Data › Equipment Master › Delete — Local Middleware
 * Validates the :equipId route param for DELETE /equipment/:equipId.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateEquipIdParam = preprocess({
  target: 'params',
  schema: {
    equipId: { required: true },
  },
})
