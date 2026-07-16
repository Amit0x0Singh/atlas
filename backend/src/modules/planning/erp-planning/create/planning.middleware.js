/**
 * Planning › ERP Planning › Create — Local Middleware
 * Validates POST /planning/analyse, /planning/plans, /planning/time-motion,
 * and POST /planning/jobs/:id/qc. di_number/product_code/equipment_id/
 * bom_id are business identifiers, never numeric-coerced.
 */
import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { isRequiredUUID } from '../../../../middleware/validators/common.js'

const idFields = ['di_number', 'product_code', 'equipment_id', 'bom_id', 'consolidation_group']

export const validateAnalyseOrder = preprocess({
  excludeFromConversion: idFields,
  schema: {
    di_number: { required: true },
  },
})

export const validateCreatePlan = preprocess({
  excludeFromConversion: idFields,
  schema: {
    di_number:     { required: true },
    product_code:  { required: true },
    bom_id:        { required: true, custom: (value) => isRequiredUUID('bom_id', value) },
    planned_qty:   { required: true, positive: true },
    equipment_id:  { required: true, custom: (value) => isRequiredUUID('equipment_id', value) },
    batch_count:   { required: true, positive: true },
  },
})

export const validateLogTimeMotion = preprocess({
  excludeFromConversion: idFields,
  schema: {
    product_code:    { required: true },
    operation_stage: { required: true },
    qty_produced:    { required: true, positive: true },
    time_hrs:        { required: true, positive: true },
  },
})

export const validateRecordQc = preprocess({
  schema: {
    result: { required: true, enum: ['pass', 'fail', 'hold'] },
  },
})

export const validateJobIdParam = preprocess({
  target: 'params',
  schema: {
    id: { custom: (value) => isRequiredUUID('id', value) },
  },
})
