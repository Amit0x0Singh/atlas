import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { isNonEmptyArray } from '../../../../middleware/validators/common.js'
import { isPositiveFloat, isNonNegativeFloat, isPositiveInteger } from '../../../../middleware/validators/number.js'

// bulkSaveRecipe's body is `{ rows: [...] }` — a flat top-level schema can't
// reach into array elements, so `rows` gets one `custom` rule that walks the
// array itself and reuses the same field-level validators every flat schema
// uses. The controller already silently drops rows missing identity fields
// (productCode/rmCode/etc.) via its own `valid = rows.filter(...)` — that
// behavior is left alone. What isn't safe today is qtyPerUnit/requiredCfu
// reaching `parseFloat`/`toCanonical` as garbage and becoming NaN in the DB,
// so those are the fields validated here (only when present, per the
// "optional but well-formed" rule every other schema in this codebase follows).
function validateRows(rows) {
  const arrErr = isNonEmptyArray('rows', rows)
  if (arrErr.length) return arrErr
  const errors = []
  rows.forEach((row, i) => {
    const prefix = `rows[${i}]`
    errors.push(...isPositiveFloat(`${prefix}.qtyPerUnit`, row?.qtyPerUnit))
    errors.push(...isNonNegativeFloat(`${prefix}.requiredCfu`, row?.requiredCfu))
    errors.push(...isPositiveInteger(`${prefix}.recipeNo`, row?.recipeNo))
  })
  return errors
}

export const validateBulkSaveRecipe = preprocess({
  schema: {
    rows: { custom: (value) => validateRows(value) },
  },
})
