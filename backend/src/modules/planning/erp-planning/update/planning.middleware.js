/**
 * Planning › ERP Planning › Update — Local Middleware
 * submitPlan/publishPlan/startJob take no body — just the shared :id param
 * check (imported from create, same validator). delayJob needs a body check.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'

export const validateDelayJob = preprocess({
  schema: {
    delay_reason_code: { required: true },
  },
})
