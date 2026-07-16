/**
 * Global Sanitization & Normalization Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Recursively cleans req[target] (objects and arrays) before it reaches type
 * conversion / validation / the controller:
 *   - trims every string value
 *   - collapses internal whitespace runs to a single space
 *   - converts "" -> null (so downstream `required` checks see a real absence,
 *     not an empty string that happens to pass a naive truthy check)
 *   - lowercases a string ONLY when its own key is in `lowercaseFields` — kept
 *     configurable per-route instead of hardcoded, since most identifier/name
 *     fields (company, supplier_name, ...) must NOT be case-folded.
 *
 * Usage in local middleware:
 *   import { sanitizeBody } from '../../../../middleware/preprocessing/sanitize.js'
 *   sanitizeBody({ lowercaseFields: ['email'] })
 */

function sanitizeValue(value, key, lowercaseFields) {
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

export function sanitizeBody({ target = 'body', lowercaseFields = [] } = {}) {
  return function (req, res, next) {
    if (req[target] && typeof req[target] === 'object') {
      setRequestTarget(req, target, sanitizeValue(req[target], null, lowercaseFields))
    }
    next()
  }
}

// Express 5 defines req.query as a getter (on the shared request prototype,
// not the instance) with no setter — it re-parses the URL fresh on every
// access, so a plain `req.query = value` throws, and even if it didn't, the
// assignment wouldn't survive the next read. Object.defineProperty always
// creates an own property on the instance that shadows the prototype
// getter, turning it into a normal writable value for the rest of this
// request — downstream middleware/controllers keep reading req.query
// exactly as before, just seeing the sanitized value instead of a fresh
// re-parse. req.body/req.params are already plain writable own properties,
// so this has the same effect there as a normal assignment would.
export function setRequestTarget(req, target, value) {
  Object.defineProperty(req, target, { value, writable: true, configurable: true, enumerable: true })
}
