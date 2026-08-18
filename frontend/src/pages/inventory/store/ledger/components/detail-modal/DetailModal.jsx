import './DetailModal.css'

// Same badge palette the Ledger table itself uses for transaction-type pills
// — so a value reads the same color whether you're scanning the table or
// looking at this modal.
const TX_COLORS = {
  INWARD:            'bg-green-100 text-green-800',
  BOM_ISSUANCE:      'bg-blue-100 text-blue-800',
  PACK_TO_CONTAINER: 'bg-purple-100 text-purple-800',
  STOCK_RECON:       'bg-orange-100 text-orange-800',
}

const TONE_TEXT = {
  in:  'text-emerald-600',
  out: 'text-red-600',
}

/** A titled card with an icon chip — one per logical group of fields. */
export function DSection({ icon: Icon, title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        {Icon && (
          <span className="w-5 h-5 rounded bg-white border border-gray-200 flex items-center justify-center text-gray-500 flex-shrink-0">
            <Icon size={11} />
          </span>
        )}
        <h3 className="text-xs font-semibold text-gray-700">{title}</h3>
      </div>
      <div className="p-3">
        <DGrid>{children}</DGrid>
      </div>
    </div>
  )
}

export function DGrid({ children }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2">{children}</div>
}

/**
 * `mono`  — IDs/codes, rendered in a light chip so they read as data, not prose.
 * `badge` — categorical value (transaction type, status) as a colored pill.
 * `tone`  — 'in' | 'out', colors a quantity green/red like the ledger table.
 * `full`  — spans both grid columns, for values too long to sit in half-width
 *           (this is what fixes "Reference" wrapping awkwardly mid-word).
 * 13px is the largest text anywhere in this modal — labels/mono stay
 * smaller than that at text-xs (12px).
 */
export function DRow({ label, value, mono, badge, tone, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      {badge ? (
        <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full ${TX_COLORS[value] || 'bg-gray-100 text-gray-600'}`}>
          {typeof value === 'string' ? value.replace(/_/g, ' ') : value}
        </span>
      ) : mono ? (
        <p className="font-mono text-xs text-blue-700 bg-blue-50 inline-block px-1.5 py-0.5 rounded break-all">{value}</p>
      ) : (
        <p className={`text-[13px] font-medium break-words ${TONE_TEXT[tone] || 'text-gray-800'}`}>{value}</p>
      )}
    </div>
  )
}
