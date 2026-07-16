/**
 * Gate › Delete — Local Middleware
 * Validates the :id route param for DELETE /api/gate/inward/:id and
 * DELETE /api/gate/outward/:id, so a malformed id gets a clean 400 instead
 * of a raw Prisma error. Built from the global preprocessing pipeline — see
 * middleware/preprocessing/index.js.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { isRequiredUUID } from '../../../../middleware/validators/common.js'

export const validateGateIdParam = preprocess({
  target: 'params',
  schema: {
    id: { custom: (value) => isRequiredUUID('id', value) },
  },
})
