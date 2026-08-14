// Frontend mirror of the backend's canonical email/phone rules
// (backend/src/utils/text-normalize.js) — the backend's Prisma Client
// Extension is what actually GUARANTEES correct storage regardless of what
// the frontend sends, so this only needs to cover the two genuinely
// free-typed field kinds (email, phone) closely enough to show the user the
// normalized value immediately instead of only after a save+reload. Not a
// full port of the backend's invisible-Unicode-stripping general
// normalizer — overkill for a live-typing UX helper.

export function normalizeEmailInput(value) {
  if (typeof value !== 'string') return value;
  return value.trim().replace(/ {2,}/g, ' ').toLowerCase();
}

export function normalizePhoneInput(value) {
  if (typeof value !== 'string') return value;
  const kept = value.replace(/[^\d+]/g, '');
  const hasLeadingPlus = kept.startsWith('+');
  const digitsOnly = kept.replace(/\+/g, '');
  return hasLeadingPlus ? `+${digitsOnly}` : digitsOnly;
}

// Matches this app's own field-naming convention closely enough for the
// handful of real phone fields in resources.js (all literally named
// "phone") — not meant to be a clever general heuristic.
export function isPhoneFieldName(name) {
  return /phone/i.test(name);
}
