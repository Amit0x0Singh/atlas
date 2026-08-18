import { useEffect, useState } from 'react'
import { X, Info, GitCompare } from 'lucide-react'
import { Modal, IconButton } from '../../../../../components/ui'
import { ACTION_COLORS } from '../audit-table/AuditTable.jsx'

function fmt(v) {
  if (v === null || v === undefined) return '—'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

/** A titled card with an icon chip — mirrors the DSection pattern used in the Stock Ledger detail modal. */
function Section({ icon: Icon, title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="w-5 h-5 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
          <Icon size={11} />
        </span>
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function Row({ label, value, mono, badge, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {badge ? (
        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${ACTION_COLORS[value] || 'bg-gray-100 text-gray-600'}`}>{value}</span>
      ) : mono ? (
        <p className="font-mono text-xs text-blue-700 bg-blue-50 inline-block px-1.5 py-0.5 rounded break-all">{value}</p>
      ) : (
        <p className="text-[13px] font-medium text-gray-800 break-words">{value}</p>
      )}
    </div>
  )
}

/** Union of both objects' keys, one row per key, old vs new side by side — changed keys highlighted. */
function JsonDiff({ oldValue, newValue }) {
  if (!oldValue && !newValue) return <p className="text-xs text-gray-400">No before/after data recorded for this action.</p>
  const keys = [...new Set([...Object.keys(oldValue || {}), ...Object.keys(newValue || {})])].sort()
  if (!keys.length) return <p className="text-xs text-gray-400">No before/after data recorded for this action.</p>

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-gray-500">
            <th className="text-left px-2 py-1.5 font-semibold w-1/4">Field</th>
            <th className="text-left px-2 py-1.5 font-semibold">Before</th>
            <th className="text-left px-2 py-1.5 font-semibold">After</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const before = oldValue ? oldValue[k] : undefined
            const after = newValue ? newValue[k] : undefined
            const changed = oldValue && newValue && fmt(before) !== fmt(after)
            return (
              <tr key={k} className={`border-t border-gray-100 ${changed ? 'bg-amber-50' : ''}`}>
                <td className="px-2 py-1.5 font-mono text-gray-500 align-top">{k}</td>
                <td className={`px-2 py-1.5 align-top break-all ${changed ? 'text-red-600' : 'text-gray-600'}`}>{fmt(before)}</td>
                <td className={`px-2 py-1.5 align-top break-all ${changed ? 'text-emerald-700 font-medium' : 'text-gray-600'}`}>{fmt(after)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function AuditDetailModal({ row, onClose }) {
  // Keep rendering the last non-null row while Modal fades out — same
  // pattern as TransactionDetailModal.jsx, avoids an empty-panel flash.
  const [shown, setShown] = useState(row)
  useEffect(() => { if (row) setShown(row) }, [row])

  return (
    <Modal open={!!row} onClose={onClose} size="xl">
      {shown && (
        <>
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
            <h2 className="text-[13px] font-bold text-gray-900">Audit Log Detail</h2>
            <IconButton icon={X} onClick={onClose} variant="ghost" size="sm" tooltip="Close" />
          </div>

          <div className="px-4 py-3 space-y-2.5 max-h-[75vh] overflow-y-auto text-[13px]">
            <Section icon={Info} title="Action">
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                <Row label="User" value={shown.fullName || shown.username || '—'} />
                <Row label="Action" value={shown.action} badge />
                <Row label="Module" value={shown.module || '—'} />
                <Row label="Resource" value={shown.tableName || '—'} mono />
                <Row label="Record ID" value={shown.recordId || '—'} mono />
                <Row label="Date & Time" value={new Date(shown.createdAt).toLocaleString('en-IN')} />
                <Row label="IP Address" value={shown.ipAddress || '—'} mono />
                <Row label="User Agent" value={shown.userAgent || '—'} full />
                {shown.notes && <Row label="Notes" value={shown.notes} full />}
              </div>
            </Section>

            <Section icon={GitCompare} title="What Changed">
              <JsonDiff oldValue={shown.oldValue} newValue={shown.newValue} />
            </Section>
          </div>
        </>
      )}
    </Modal>
  )
}
