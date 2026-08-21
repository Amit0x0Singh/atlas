import { preprocess } from '../../../../../middleware/preprocessing/index.js'
import { isRequired, isNonEmptyArray } from '../../../../../middleware/validators/common.js'
import { isRequiredPositiveFloat } from '../../../../../middleware/validators/number.js'

// createSfgOutward's body nests two levels of arrays
// (`requirements[].allocations[]`) that a flat schema can't reach, so
// `requirements` gets one `custom` rule that walks both levels and applies
// the exact same required/positive checks the controller currently does by
// hand (`!r.required_qty_kg`, `!a.qty_issued_kg || Number(a.qty_issued_kg)
// <= 0`, etc.) — just moved earlier, so a non-numeric qty_issued_kg is
// rejected with a 400 before it reaches the allocation transaction instead
// of silently becoming NaN partway through issuing stock.
function validateRequirements(requirements) {
  const arrErr = isNonEmptyArray('requirements', requirements)
  if (arrErr.length) return arrErr
  const errors = []
  requirements.forEach((r, i) => {
    const rPrefix = `requirements[${i}]`
    errors.push(...isRequired(`${rPrefix}.microbe_code`, r?.microbe_code))
    errors.push(...isRequiredPositiveFloat(`${rPrefix}.required_qty_kg`, r?.required_qty_kg))
    errors.push(...isRequiredPositiveFloat(`${rPrefix}.required_cfu_per_g`, r?.required_cfu_per_g))
    const allocArrErr = isNonEmptyArray(`${rPrefix}.allocations`, r?.allocations)
    if (allocArrErr.length) { errors.push(...allocArrErr); return }
    r.allocations.forEach((a, j) => {
      const aPrefix = `${rPrefix}.allocations[${j}]`
      errors.push(...isRequired(`${aPrefix}.inward_id`, a?.inward_id))
      errors.push(...isRequiredPositiveFloat(`${aPrefix}.qty_issued_kg`, a?.qty_issued_kg))
    })
  })
  return errors
}

export const validateCreateSfgOutward = preprocess({
  schema: {
    product_name:  { required: true },
    requirements:  { custom: (value) => validateRequirements(value) },
    order_qty_kg:  { positive: true },
  },
})

// upsertOutwardSession auto-saves a work-in-progress issuance form; `header`
// and `rows` are opaque JSON blobs (no numeric fields of their own to
// type-check) but the controller already 400s if either is missing. That
// check is `!header`/`!rows` — a plain falsy test, under which an empty
// array/object (the shape this auto-saves as before the user has added any
// rows) is truthy and accepted. `required: true` uses stricter non-blank
// string semantics that would reject `rows: []`, so a `custom` falsy check
// is used here instead to reproduce the controller's exact current behavior.
const requiredIfFalsy = (field) => (value) => (!value ? [`${field} is required`] : [])

export const validateUpsertOutwardSession = preprocess({
  schema: {
    header: { custom: requiredIfFalsy('header') },
    rows:   { custom: requiredIfFalsy('rows') },
  },
})
