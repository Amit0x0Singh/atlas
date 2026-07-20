const ITEM_CODE_DIGITS = 7

// House standard: a purely numeric RM item code shorter than 7 digits gets
// zero-padded on the left (e.g. "177822" -> "0177822"). Codes that already
// have 7+ digits, or aren't purely numeric, pass through untouched — this
// only ever normalizes new codes; existing rows are never renamed by it.
export function padItemCode(code) {
  const trimmed = String(code || '').trim()
  return /^\d+$/.test(trimmed) && trimmed.length < ITEM_CODE_DIGITS
    ? trimmed.padStart(ITEM_CODE_DIGITS, '0')
    : trimmed
}
