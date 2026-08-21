import { preprocess } from '../../../../middleware/preprocessing/index.js'
import { isNonEmptyArray, isEnum } from '../../../../middleware/validators/common.js'
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

// fixRmMapping's body is `{ mappings: [...] }` — same array-body situation.
// The controller already requires a non-empty array (`if (!Array.isArray
// (mappings) || mappings.length === 0)`); this mirrors that check plus the
// `kind` enum the controller itself branches on. The frontend sends 'rm'
// explicitly (RecipeDB.jsx, ComponentsTable.jsx) for the implicit/default
// `else` branch, so 'rm' is a valid value here too, not just 'product'/'microbe'.
function validateMappings(mappings) {
  const arrErr = isNonEmptyArray('mappings', mappings)
  if (arrErr.length) return arrErr
  const errors = []
  mappings.forEach((m, i) => {
    errors.push(...isEnum(`mappings[${i}].kind`, m?.kind, ['product', 'microbe', 'rm']))
  })
  return errors
}

export const validateFixRmMapping = preprocess({
  schema: {
    mappings: { custom: (value) => validateMappings(value) },
  },
})
