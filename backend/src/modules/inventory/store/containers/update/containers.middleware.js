/**
 * Containers › Update — Local Middleware
 * Validates PATCH /:containerId/capacity.
 */
import { preprocess } from '../../../../../middleware/preprocessing/index.js'

export const validateUpdateCapacity = preprocess({
  schema: {
    capacity: { required: true, positive: true },
  },
})
