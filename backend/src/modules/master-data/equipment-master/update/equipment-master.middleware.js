/**
 * Master Data › Equipment Master › Update — Local Middleware
 * Validates PUT /equipment/:equipId.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateUpdateEquipment = preprocess({
  schema: {
    equipName:         { minLength: 2, maxLength: 150 },
    workingVolume:     { positive: true },
    designatedProduct: { maxLength: 200 },
    workingUnit:       { maxLength: 20 },
  },
})

export const validateEquipIdParam = preprocess({
  target: 'params',
  schema: {
    equipId: { required: true },
  },
})
