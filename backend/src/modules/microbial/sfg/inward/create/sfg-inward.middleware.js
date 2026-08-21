import { preprocess } from '../../../../../middleware/preprocessing/index.js'
import { isNonEmptyArray } from '../../../../../middleware/validators/common.js'
import { isValidDate } from '../../../../../middleware/validators/date.js'

// createSfgInward currently 400s manually when any of these six are falsy —
// this schema moves that same requirement up into validation and adds
// well-formedness checks (positive/date) so a non-numeric total_qty_kg or
// inhouse_cfu_per_g can no longer reach `Number(...)` and become NaN in the
// microbialSfgInward/microbialSfgContainer rows it writes.
export const validateCreateSfgInward = preprocess({
  schema: {
    microbe_code:        { required: true },
    microbe_type:         { required: true },
    inhouse_cfu_per_g:    { required: true, positive: true },
    biomass_batch_code:   { required: true },
    date_of_harvest:      { required: true, custom: (value) => isValidDate('date_of_harvest', value) },
    total_qty_kg:         { required: true, positive: true },
    moisture:             { nonNegative: true },
    shelf_life_days:      { positiveInt: true },
    pouch_nos:            { positiveInt: true },
    pouch_qty:            { positive: true },
    fill_status:          { enum: ['EMPTY', 'PARTIAL', 'FULL'] },
    rack:                 { positiveInt: true },
    shelf:                { positiveInt: true },
  },
})

// importSfgInward is a bulk `{ rows: [...] }` import — the controller
// already validates every row's fields itself (parseFloat with a falsy-check
// fallback, so a non-numeric cfu/qty is treated as "missing" and the row is
// skipped + logged rather than written as NaN). The one thing it doesn't
// already guard is the top-level shape, which this mirrors exactly
// (`if (!Array.isArray(rows) || !rows.length)`).
export const validateImportSfgInward = preprocess({
  schema: {
    rows: { custom: (value) => isNonEmptyArray('rows', value) },
  },
})
