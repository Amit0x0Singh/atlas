/**
 * Global Validation Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs LAST in the pipeline, after sanitize + type-convert, so every rule
 * below sees already-clean, already-typed data. This file adds no new
 * validation logic of its own — it's a declarative schema dispatcher over
 * the existing pure validator functions in middleware/validators/*.js, so
 * there's exactly one implementation of "what counts as a valid email" etc.
 * anywhere in the codebase.
 *
 * Schema shape — one rule-object per field:
 *   {
 *     supplier_name: { required: true, minLength: 2, maxLength: 150 },
 *     email:         { required: true, email: true },
 *     company:       { required: true, enum: VALID_COMPANIES },
 *     qty:           { required: true, positive: true },
 *     custom_field:  { custom: (value, allValues, field) => [...errors] },
 *   }
 *
 * Usage in local middleware:
 *   import { validate } from '../../../../middleware/preprocessing/validate.js'
 *   validate({ email: { required: true, email: true } })
 */
import { isRequired, isEnum, validationError } from '../validators/common.js'
import { isMinLength, isMaxLength, isEmail, isIndianPhone } from '../validators/string.js'
import { isPositiveFloat } from '../validators/number.js'

const RULE_RUNNERS = {
  required:  (field, value, ruleValue) => (ruleValue ? isRequired(field, value) : []),
  minLength: (field, value, ruleValue) => isMinLength(field, value, ruleValue),
  maxLength: (field, value, ruleValue) => isMaxLength(field, value, ruleValue),
  email:     (field, value, ruleValue) => (ruleValue ? isEmail(field, value) : []),
  phone:     (field, value, ruleValue) => (ruleValue ? isIndianPhone(field, value) : []),
  positive:  (field, value, ruleValue) => (ruleValue ? isPositiveFloat(field, value) : []),
  enum:      (field, value, ruleValue) => isEnum(field, value, ruleValue),
}

export function validate(schema, { target = 'body' } = {}) {
  return function (req, res, next) {
    const data = req[target] || {}
    const errors = []

    for (const [field, rules] of Object.entries(schema)) {
      const value = data[field]
      for (const [ruleName, ruleValue] of Object.entries(rules)) {
        if (ruleName === 'custom') {
          errors.push(...(ruleValue(value, data, field) || []))
          continue
        }
        const runner = RULE_RUNNERS[ruleName]
        if (!runner) continue
        errors.push(...runner(field, value, ruleValue))
      }
    }

    if (errors.length) return res.status(400).json(validationError(errors))
    next()
  }
}
