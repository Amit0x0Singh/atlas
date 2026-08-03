// Central registry of bulk text transformations — add a new entry here and
// it's automatically available everywhere this is imported (preview, apply,
// and any future consumer), no other code needs to change.
//
// Each transform: { label, requiresParams, apply(value, params) => string }.
// `apply` always receives a real string (callers are responsible for only
// calling this on string values — see bulk-transform controllers).

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const TRANSFORMS = {
  UPPERCASE: {
    label: 'UPPERCASE',
    apply: (s) => s.toUpperCase(),
  },
  LOWERCASE: {
    label: 'lowercase',
    apply: (s) => s.toLowerCase(),
  },
  TITLE_CASE: {
    label: 'Capitalize Each Word (Title Case)',
    apply: (s) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()),
  },
  CAPITALIZE_FIRST: {
    label: 'Capitalize First Letter',
    apply: (s) => (s.length ? s.charAt(0).toUpperCase() + s.slice(1) : s),
  },
  SENTENCE_CASE: {
    label: 'Sentence case',
    apply: (s) => s.toLowerCase().replace(/(^\s*[a-z]|[.!?]\s+[a-z])/g, (m) => m.toUpperCase()),
  },
  TRIM: {
    label: 'Trim Leading & Trailing Spaces',
    apply: (s) => s.trim(),
  },
  COLLAPSE_SPACES: {
    label: 'Remove Multiple Spaces',
    apply: (s) => s.replace(/ {2,}/g, ' '),
  },
  // Covers both "Replace Text" and "Find & Replace" from the spec — a
  // literal-text replace (not regex) with an optional case-sensitivity
  // toggle is the same operation under two names.
  FIND_REPLACE: {
    label: 'Find & Replace',
    requiresParams: true,
    paramFields: ['find', 'replace', 'matchCase'],
    // Only `find` is mandatory — an empty `replace` is a valid, common case
    // (delete every occurrence of the found text).
    requiredParamFields: ['find'],
    apply: (s, params = {}) => {
      const find = params.find ?? ''
      const replace = params.replace ?? ''
      if (!find) return s
      if (params.matchCase) return s.split(find).join(replace)
      return s.replace(new RegExp(escapeRegExp(find), 'gi'), replace)
    },
  },
  ADD_PREFIX: {
    label: 'Add Prefix',
    requiresParams: true,
    paramFields: ['prefix'],
    requiredParamFields: ['prefix'],
    apply: (s, params = {}) => `${params.prefix ?? ''}${s}`,
  },
  ADD_SUFFIX: {
    label: 'Add Suffix',
    requiresParams: true,
    paramFields: ['suffix'],
    requiredParamFields: ['suffix'],
    apply: (s, params = {}) => `${s}${params.suffix ?? ''}`,
  },
}

export function getTransform(type) {
  return TRANSFORMS[type] || null
}
