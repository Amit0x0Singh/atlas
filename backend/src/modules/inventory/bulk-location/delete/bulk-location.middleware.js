/**
 * Bulk Location › Delete — Local Middleware
 * Validates the :locationId route param for DELETE /bulk-location/locations/:locationId.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateLocationIdParam = preprocess({
  target: 'params',
  schema: {
    locationId: { required: true },
  },
})
