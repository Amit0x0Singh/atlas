// Single source of truth for "this field name means credential/secret" —
// imported by both scripts/generate-field-rules.js (text-normalization
// exclusion) and the admin-panel field guard (mass-assignment / exposure
// prevention), so the two can never drift apart.
// Suffix-anchored `hash$` (not `^hash$`) deliberately — `^hash$` only
// matches a field literally named "hash", missing "pinHash" entirely
// (verified: pinHash is one of exactly two `*Hash`-suffixed fields in the
// whole schema, alongside passwordHash — no false-positive risk from
// widening this to a suffix match).
export const SECRET_FIELD_RE = /password|token|secret|apikey|api_key|refreshtoken|signature|checksum|hash$/i
