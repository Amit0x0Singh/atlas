/**
 * Gate › Update — Local Middleware
 * Validates PATCH /:id/status (VALID_STATUSES enum) and the :id route param
 * shared by both the status-update and request-delete endpoints.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { isRequiredUUID } from '../../../../middleware/validators/common.js'

const VALID_STATUSES = ['pending', 'approved', 'rejected']

export const validateStatusUpdate = preprocess({
  schema: {
    status: { required: true, enum: VALID_STATUSES },
  },
})

export const validateIdParam = preprocess({
  target: 'params',
  schema: {
    id: { custom: (value) => isRequiredUUID('id', value) },
  },
})
