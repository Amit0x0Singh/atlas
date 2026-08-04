// Central text-normalization rules — the ONE place trim/case logic is
// implemented. Every other piece of the text-storage standard (Client
// Extension registry, search-fix call sites, backfill script) describes
// its behavior in terms of these functions rather than re-implementing
// trim/case logic inline.
//
// The character-class regexes below are built from explicit numeric code
// points (String.fromCharCode) rather than embedding the literal invisible
// characters or relying on \u-escape text surviving verbatim through every
// tool in the chain — this keeps the source file itself free of any actual
// invisible/control characters, which would otherwise make it fragile to
// diff, review, or re-save through a lossy encoder.

function charClassFromCodePoints(ranges) {
  // ranges: array of [start, end] (end inclusive) or [singleCodePoint]
  const parts = ranges.map(([a, b]) => {
    const start = String.fromCharCode(a);
    if (b === undefined) return start;
    return `${start}-${String.fromCharCode(b)}`;
  });
  return new RegExp(`[${parts.join('')}]`, 'g');
}

// Invisible/formatting Unicode — deleted outright, never meaningful in
// business text: zero-width space/ZWNJ/ZWJ/LRM/RLM (U+200B-200F), bidi
// embedding/override controls (U+202A-202E), word joiner (U+2060), bidi
// isolate controls (U+2066-2069), BOM (U+FEFF), soft hyphen (U+00AD),
// Mongolian vowel separator (U+180E).
const INVISIBLE_DELETE_RE = charClassFromCodePoints([
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060],
  [0x2066, 0x2069],
  [0xfeff],
  [0x00ad],
  [0x180e],
]);

// C0 controls (minus tab/newline/CR, handled below) + DEL + C1 controls.
const CONTROL_DELETE_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g;

// Every other Unicode whitespace variant — converted to a plain space
// (then collapsed): tab, newline, CR, NBSP (U+00A0), Ogham space mark
// (U+1680), en/em/thin spaces (U+2000-200A), line/paragraph separator
// (U+2028-2029), narrow NBSP (U+202F), medium math space (U+205F),
// ideographic space (U+3000).
const WHITESPACE_TO_SPACE_RE = charClassFromCodePoints([
  [0x09], [0x0a], [0x0d],
  [0x00a0],
  [0x1680],
  [0x2000, 0x200a],
  [0x2028, 0x2029],
  [0x202f],
  [0x205f],
  [0x3000],
]);

const MULTI_SPACE_RE = / {2,}/g;

/**
 * General normalization: trim, collapse whitespace, strip invisible/control
 * characters, preserve case and punctuation ('. - / & ( ) ,' and all
 * letters survive untouched by construction — no allowlist regex needed).
 * NFC-composes first so accented names compare consistently regardless of
 * how the input was composed (e.g. "e-with-acute" as one codepoint vs "e"
 * plus a combining acute accent).
 */
export function normalizeGeneral(value) {
  if (typeof value !== 'string') return value;
  return value
    .normalize('NFC')
    .replace(INVISIBLE_DELETE_RE, '')
    .replace(CONTROL_DELETE_RE, '')
    .replace(WHITESPACE_TO_SPACE_RE, ' ')
    .replace(MULTI_SPACE_RE, ' ')
    .trim();
}

// Business data (Company/Supplier/Customer/Product/RM/Packing-Material/
// Employee/Equipment/Plant/Warehouse Name, Address, Remarks, Notes,
// Description) — general normalization only, case preserved exactly as
// typed. Alias (not a reimplementation) so it can never drift from
// normalizeGeneral's behavior.
export const normalizeBusinessName = normalizeGeneral;

// System data (Email, Username, API keys, auth identifiers) — free-typed
// identifiers where consistent case matters. NOT used for fixed-vocabulary
// dropdown fields (status/role/type/category) — those are RULES.NONE
// because this codebase compares them against UPPERCASE literals in many
// places; force-lowercasing would silently break those comparisons.
export function normalizeLower(value) {
  const s = normalizeGeneral(value);
  return typeof s === 'string' ? s.toLowerCase() : s;
}

// Business identifiers/reference codes (Item/Product/Material/Batch Code,
// Lot Number, DI Number, Vehicle Number, GSTIN, PAN, SKU, Equipment/Plant
// Code, etc.).
export function normalizeUpper(value) {
  const s = normalizeGeneral(value);
  return typeof s === 'string' ? s.toUpperCase() : s;
}

// Phone numbers: digits + one optional leading '+' only — no spaces,
// hyphens, or brackets.
const PHONE_STRIP_RE = /[^\d+]/g;
export function normalizePhone(value) {
  if (typeof value !== 'string') return value;
  const kept = value.replace(PHONE_STRIP_RE, '');
  const hasLeadingPlus = kept.startsWith('+');
  const digitsOnly = kept.replace(/\+/g, '');
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

export const RULES = Object.freeze({
  NONE: 'NONE',
  LOWER: 'LOWER',
  UPPER: 'UPPER',
  PHONE: 'PHONE',
});

const APPLY = {
  [RULES.NONE]: normalizeGeneral,
  [RULES.LOWER]: normalizeLower,
  [RULES.UPPER]: normalizeUpper,
  [RULES.PHONE]: normalizePhone,
};

/**
 * Single dispatcher every consumer (Client Extension, backfill script,
 * scan script) calls. An unrecognized rule falls back to general
 * normalization rather than throwing — a bad registry entry shouldn't take
 * down a live write path — but logs loudly so it gets fixed.
 */
export function applyRule(rule, value) {
  const fn = APPLY[rule];
  if (!fn) {
    console.error(`[text-normalize] unknown rule "${rule}" — falling back to NONE`);
    return normalizeGeneral(value);
  }
  return fn(value);
}
