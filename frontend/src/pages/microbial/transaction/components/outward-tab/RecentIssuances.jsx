import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { fmtCfu, fmtDateTime } from '../../utils/format.js'

export default function RecentIssuances({ items }) {
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-base font-bold text-gray-900 mb-4">Recent Issuances</h3>
      {items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">📤</div>
          <p className="text-sm">No issuances yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.slice(0, 20).map((o) => {
            const isOpen = expanded === o.outward_id
            const totalKg = o.lines.reduce((s, l) => s + Number(l.qty_issued_kg), 0)
            return (
              <div key={o.outward_id} className="py-2.5">
                <button type="button" className="w-full flex items-center justify-between text-left" onClick={() => setExpanded(isOpen ? null : o.outward_id)}>
                  <div className="flex items-center gap-2 min-w-0">
                    {isOpen ? <ChevronDown size={15} className="text-gray-400 flex-shrink-0" /> : <ChevronRight size={15} className="text-gray-400 flex-shrink-0" />}
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-gray-900 truncate">{o.product_name}{o.customer_name ? ` — ${o.customer_name}` : ''}</div>
                      <div className="text-[11px] text-gray-400">{fmtDateTime(o.issued_at)} {o.issuer_name ? `· by ${o.issuer_name}` : ''}</div>
                    </div>
                  </div>
                  <div className="text-sm font-bold text-red-600 flex-shrink-0">−{totalKg.toFixed(3)} kg</div>
                </button>
                {isOpen && (
                  <div className="mt-2 ml-6 space-y-1.5">
                    {o.lines.map((l) => (
                      <div key={l.line_id} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                        <div>
                          <span className="font-semibold text-gray-800">{l.microbe_name}</span>{' '}
                          <span className="font-mono text-gray-500">{l.container_code}</span>{' '}
                          {l.is_partial && <span className="text-amber-600 font-semibold">(partial)</span>}
                          <div className="text-gray-400">CFU/g at issue: {fmtCfu(l.cfu_per_g_at_issue)} · Balance after: {Number(l.balance_after_kg).toFixed(3)} kg</div>
                        </div>
                        <div className="font-bold text-gray-900">{Number(l.qty_issued_kg).toFixed(3)} kg</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
