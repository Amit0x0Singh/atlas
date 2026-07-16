/**
 * Global Type Conversion Middleware
 * ─────────────────────────────────────────────────────────────────────────────
 * Runs AFTER sanitize.js (so "" has already become null and doesn't get
 * misread as a numeric/boolean candidate here). Recursively converts
 * frontend string values into proper JS types:
 *   - "true" / "false"           -> boolean
 *   - "null"                     -> null
 *   - numeric-looking strings    -> Number
 *
 * Identifiers must never be silently coerced to Number (a phone/PIN/GST/PAN/
 * invoice/batch number that loses a leading zero, or gets turned into a
 * float, is a data-corruption bug, not a convenience). Two layers guard
 * against that, both configurable rather than hardcoded per controller:
 *   1. DEFAULT_IDENTIFIER_PATTERNS — one shared list of field-name patterns
 *      (id, *_no, *_number, *_code, phone, gst, pan, pin, invoice, batch,
 *      lot, vehicle, uuid, ...) that are always left as strings.
 *   2. `excludeFields` — an explicit per-route list for anything the default
 *      patterns don't catch, e.g. a field just called `code`.
 * A leading-zero guard (`/^0\d/`) is also applied as a last-resort safety
 * net, since a genuine number is very rarely written with a leading zero.
 *
 * Usage in local middleware:
 *   import { convertTypes } from '../../../../middleware/preprocessing/typeConvert.js'
 *   convertTypes({ excludeFields: ['invoice_no', 'vehicle_no'] })
 */
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
