import { preprocess } from '../../../../../middleware/preprocessing/index.js'
import { REASON_CATEGORIES } from './sfg-adjustment.controller.js'

// The controller re-checks all of this (and the live remaining-qty ceiling
// it can't know here), but rejecting a blank reason / non-positive qty /
// unknown category with a 400 up front keeps a bad request from opening a
// stock transaction at all — same split as validateCreateSfgOutward.
export const validateCreateSfgAdjustment = preprocess({
  schema: {
    inward_id:       { required: true },
    loss_qty_kg:     { required: true, positive: true },
    reason_category: { required: true, enum: REASON_CATEGORIES },
    reason:          { required: true, minLength: 3, maxLength: 500 },
    adjusted_by:     { required: true, minLength: 2, maxLength: 150 },
    stage:           { maxLength: 150 },
    remarks:         { maxLength: 500 },
  },
})
