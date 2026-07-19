import { setRequestTarget } from './sanitize.js'

export const DEFAULT_IDENTIFIER_PATTERNS = [
  /(^|_)id$/i,   // snake_case: id, item_id, rm_id
  /[a-z]Id$/,    // camelCase: itemId, lotEntryId, containerId
  /_no$/i,
  /_number$/i,
  /_code$/i,
  /code$/i,
  /phone/i,
  /mobile/i,
  /gst/i,
  /\bpan\b/i,
  /pin(code)?/i,
  /invoice/i,
  /batch/i,
  /\blot\b/i,
  /vehicle/i,
  /uuid/i,
]

function looksLikeIdentifier(fieldName, patterns) {
  return !!fieldName && patterns.some((re) => re.test(fieldName))
}

function convertString(value) {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  // Leading-zero strings ("007700", "0123") are almost always identifiers
  // that happen to not match a name pattern — never coerce those.
  if (/^0\d/.test(value)) return value
  if (value !== '' && !isNaN(value) && !isNaN(parseFloat(value))) return Number(value)
  return value
}

function convertValue(value, key, opts) {
  if (Array.isArray(value)) {
    return value.map((item) => convertValue(item, key, opts))
  }

  if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
    const out = {}
    for (const [k, v] of Object.entries(value)) {
      out[k] = convertValue(v, k, opts)
    }
    return out
  }

  if (typeof value !== 'string') return value
  if (opts.excludeFields.includes(key)) return value
  if (looksLikeIdentifier(key, opts.identifierPatterns)) return value

  return convertString(value)
}

export function convertTypes({
  target = 'body',
  excludeFields = [],
  identifierPatterns = DEFAULT_IDENTIFIER_PATTERNS,
} = {}) {
  return function (req, res, next) {
    if (req[target] && typeof req[target] === 'object') {
      // req.query is a getter-only property in Express 5 (re-parses the URL
      // fresh on every access) — see setRequestTarget in sanitize.js for why
      // a plain assignment can't be used here for every target.
      setRequestTarget(req, target, convertValue(req[target], null, { excludeFields, identifierPatterns }))
    }
    next()
  }
}
