// Display helpers shared by the requester page and the Store's Open Indents workflow.

import { toTitleCase } from '../../../../utils/textDisplay.js'

// Who raised an indent, for display — the snapshotted full name in Title Case
// ("Amit Nano"), falling back to the login email for older rows that predate
// the requesterName column.
export function requesterLabel(indent) {
  const name = (indent?.requesterName || '').trim()
  return name ? toTitleCase(name) : (indent?.createdBy || '—')
}

export const STATUS_META = {
  DRAFT:     { label: 'Draft',            cls: 'bg-gray-100 text-gray-600' },
  OPEN:      { label: 'Open',             cls: 'bg-blue-100 text-blue-700' },
  PARTIAL:   { label: 'Partially Issued', cls: 'bg-amber-100 text-amber-700' },
  COMPLETED: { label: 'Completed',        cls: 'bg-green-100 text-green-700' },
  REJECTED:  { label: 'Rejected',         cls: 'bg-red-100 text-red-700' },
  CANCELLED: { label: 'Cancelled',        cls: 'bg-gray-100 text-gray-500' },
}

export const LINE_STATUS_META = {
  PENDING:  { label: 'Pending',  cls: 'bg-gray-100 text-gray-600' },
  PARTIAL:  { label: 'Partial',  cls: 'bg-amber-100 text-amber-700' },
  ISSUED:   { label: 'Issued',   cls: 'bg-green-100 text-green-700' },
  REJECTED: { label: 'Rejected', cls: 'bg-red-100 text-red-700' },
}

export const PRIORITY_META = {
  Normal:   { cls: 'text-gray-500 font-semibold' },
  Urgent:   { cls: 'text-amber-700 font-bold' },
  Critical: { cls: 'text-red-700 font-bold' },
}

export function statusPill(status) {
  return STATUS_META[status] || STATUS_META.DRAFT
}

export function fmtDate(v) {
  if (!v) return '—'
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function fmtNum(n) {
  const x = Number(n) || 0
  return x % 1 === 0 ? x.toLocaleString('en-IN') : x.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}
