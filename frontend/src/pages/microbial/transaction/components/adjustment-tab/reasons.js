// Reason categories for a microbial SFG stock loss — value must match the
// backend REASON_CATEGORIES list (sfg-adjustment.controller.js). `reason`
// (the free-text detail) is captured separately.
export const REASON_CATEGORIES = [
  { value: 'ISSUANCE',           label: 'During Issuance' },
  { value: 'PRODUCTION_RELEASE', label: 'Production Release' },
  { value: 'TRANSPORT',          label: 'Transportation' },
  { value: 'SPILLAGE',           label: 'Spillage' },
  { value: 'CONTAMINATION',      label: 'Contamination' },
  { value: 'WEIGHING_ERROR',     label: 'Weighing Error' },
  { value: 'OTHER',              label: 'Other' },
]

export const REASON_LABEL = Object.fromEntries(REASON_CATEGORIES.map((r) => [r.value, r.label]))
