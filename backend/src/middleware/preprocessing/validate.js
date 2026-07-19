
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
