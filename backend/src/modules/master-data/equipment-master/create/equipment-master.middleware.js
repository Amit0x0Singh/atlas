/**
 * Master Data › Equipment Master › Create — Local Middleware
 * Validates POST /equipment.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateCreateEquipment = preprocess({
  schema: {
    equipName:         { required: true, minLength: 2, maxLength: 150 },
    workingVolume:     { positive: true },
    designatedProduct: { maxLength: 200 },
    workingUnit:       { maxLength: 20 },
  },
})
