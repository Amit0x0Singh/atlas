import { preprocess } from '../../../../../middleware/preprocessing/index.js'

// updateSfgInward is a partial-update route — every field is optional
// (`if (x !== undefined) data.x = ...`), so nothing here is `required`. What
// it lacked was any well-formedness check before `Number(...)`, so a
// non-numeric remaining_qty_kg/moisture/shelf_life_days could silently
// become NaN and get written straight to the row.
export const validateUpdateSfgInward = preprocess({
  schema: {
    remaining_qty_kg: { nonNegative: true },
    fill_status:      { enum: ['EMPTY', 'PARTIAL', 'FULL'] },
    status:           { enum: ['ACTIVE', 'EXHAUSTED'] },
    moisture:         { nonNegative: true },
    shelf_life_days:  { positiveInt: true },
  },
})
