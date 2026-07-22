export function fmtCfu(v) {
  if (!v) return '—'
  const n = Number(v)
  if (n >= 1e11) return `${(n / 1e11).toFixed(2)}×10¹¹`
  if (n >= 1e10) return `${(n / 1e10).toFixed(2)}×10¹⁰`
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}×10⁹`
  if (n >= 1e8) return `${(n / 1e8).toFixed(2)}×10⁸`
  return n.toExponential(2)
}

const BADGE_BASE = 'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset'

export function fillBadgeCls(fill) {
  if (fill === 'FULL') return `${BADGE_BASE} bg-green-50 text-green-700 ring-green-200`
  if (fill === 'PARTIAL') return `${BADGE_BASE} bg-amber-50 text-amber-700 ring-amber-200`
  return `${BADGE_BASE} bg-red-50 text-red-700 ring-red-200`
}

export function statusBadgeCls(status) {
  if (status === 'ACTIVE') return `${BADGE_BASE} bg-blue-50 text-blue-700 ring-blue-200`
  if (status === 'EXHAUSTED') return `${BADGE_BASE} bg-gray-100 text-gray-500 ring-gray-200`
  if (status === 'PARTIAL') return `${BADGE_BASE} bg-amber-50 text-amber-700 ring-amber-200`
  if (status === 'ISSUED') return `${BADGE_BASE} bg-blue-50 text-blue-700 ring-blue-200`
  return `${BADGE_BASE} bg-blue-50 text-blue-700 ring-blue-200`
}

// Derives a short type code from a free-typed microbe type label, e.g.
// "Wettable Powder" -> "WP", "Biomass" -> "BIO" — used for the
// {microbe}-{type}-{seq} container code pattern when the label isn't one of
// the already-known types with an established code.
export function deriveTypeCode(label) {
  const words = (label || '').trim().split(/\s+/).filter(Boolean)
  if (words.length > 1) return words.map((w) => w[0]).join('').toUpperCase().slice(0, 4)
  return (words[0] || '').slice(0, 3).toUpperCase()
}

export function fmtDate(v) {
  if (!v) return '—'
  return new Date(v).toLocaleDateString('en-IN')
}

export function fmtDateTime(v) {
  if (!v) return '—'
  return new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
}

// Fresh / Moderate / Near Expiry / Expired / Exhausted — the container/stock
// status vocabulary shared by Storage, Stock Summary, and the Dashboard.
export function stockStatusBadgeCls(status) {
  if (status === 'Fresh') return `${BADGE_BASE} bg-green-50 text-green-700 ring-green-200`
  if (status === 'Moderate') return `${BADGE_BASE} bg-blue-50 text-blue-700 ring-blue-200`
  if (status === 'Near Expiry') return `${BADGE_BASE} bg-amber-50 text-amber-700 ring-amber-200`
  if (status === 'Expired') return `${BADGE_BASE} bg-red-50 text-red-700 ring-red-200`
  return `${BADGE_BASE} bg-gray-100 text-gray-500 ring-gray-200`
}

export function reorderSignalBadgeCls(signal) {
  if (signal === 'OK') return `${BADGE_BASE} bg-green-50 text-green-700 ring-green-200`
  if (signal === 'Watch') return `${BADGE_BASE} bg-amber-50 text-amber-700 ring-amber-200`
  return `${BADGE_BASE} bg-red-50 text-red-700 ring-red-200`
}

export function abcBadgeCls(cls) {
  if (cls === 'A') return `${BADGE_BASE} bg-red-50 text-red-700 ring-red-200`
  if (cls === 'B') return `${BADGE_BASE} bg-amber-50 text-amber-700 ring-amber-200`
  return `${BADGE_BASE} bg-gray-100 text-gray-500 ring-gray-200`
}

export function trendArrow(trend) {
  if (trend === 'up') return { symbol: '↑', cls: 'text-green-700' }
  if (trend === 'down') return { symbol: '↓', cls: 'text-red-600' }
  if (trend === 'flat') return { symbol: '→', cls: 'text-gray-500' }
  return { symbol: '', cls: '' }
}

export function healthColor(score) {
  if (score >= 80) return '#1a6b3a'
  if (score >= 60) return '#92400e'
  return '#9e1f2e'
}
