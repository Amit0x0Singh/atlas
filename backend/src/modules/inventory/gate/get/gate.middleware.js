/**
 * Gate › Get — Local Middleware
 * Validates list-filter query params for GET /api/gate/inward|outward, and
 * the :id route param for GET /api/gate/inward/:id|outward/:id. Built from
 * the global preprocessing pipeline — see middleware/preprocessing/index.js.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { isRequiredUUID } from '../../../../middleware/validators/common.js'
import { isValidDate, isValidDateRange } from '../../../../middleware/validators/date.js'

// All list filters are optional — only check shape when a value is actually
// present, and that a from/to date pair (if both given) is a sane range.
export const validateGateListQuery = preprocess({
  target: 'query',
  schema: {
    from_date: {
      custom: (value) => isValidDate('from_date', value),
    },
    to_date: {
      custom: (value, all) => [
        ...isValidDate('to_date', value),
        ...isValidDateRange('from_date', all.from_date, 'to_date', value),
      ],
    },
  },
})

export const validateGateIdParam = preprocess({
  target: 'params',
  schema: {
    id: { custom: (value) => isRequiredUUID('id', value) },
  },
})
