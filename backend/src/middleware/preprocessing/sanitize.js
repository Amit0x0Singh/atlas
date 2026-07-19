/**
 * Global Sanitization & Normalization Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 */

 const sanitizeValue = (value, key, lowercaseFields) => {
  
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item, key, lowercaseFields))
  }

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = sanitizeValue(v, k, lowercaseFields)
    }
    return out
  }

  if (typeof value === 'string') {
    const trimmed = value.trim().replace(/\s+/g, ' ') 
    if (trimmed === '') return null 
    return lowercaseFields.includes(key) ? trimmed.toLowerCase() : trimmed
  }

  return value
}


const sanitizeBody = ({ target = 'body', lowercaseFields = [] } = {}) => {
  return function (req, res, next) {
    if (req[target] && typeof req[target] === 'object') {
      setRequestTarget(req, target, sanitizeValue(req[target], null, lowercaseFields))
    }
    next()
  }
}


const setRequestTarget=(req, target, value) => {
  Object.defineProperty(req, target, {
    value,
    writable: true,
    configurable: true,
    enumerable: true
  })
  
}
 

export { sanitizeValue, sanitizeBody, setRequestTarget }