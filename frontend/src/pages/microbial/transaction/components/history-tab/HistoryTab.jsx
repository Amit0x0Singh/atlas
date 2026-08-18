import { useMemo, useState } from 'react'
import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { useMicrobeSuggestions } from '../../../../../hooks/masters/useMicrobes.js'
import { useMicrobialHistory } from '../../../../../hooks/microbial/useMicrobialHistory.js'
import { fmtCfu, fmtDateTime } from '../../utils/format.js'

import { toTitleCase } from '../../../../../utils/textDisplay.js'
export default function HistoryTab() {
  const [microbeCode, setMicrobeCode] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const { data: microbes = [] } = useMicrobeSuggestions()
  const filters = useMemo(() => ({
    microbe_code: microbeCode || undefined,
    from: from || undefined,
    to: to || undefined,
  }), [microbeCode, from, to])
  const { data: ledger = [], isLoading } = useMicrobialHistory(filters)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 w-[220px]" value={microbeCode} onChange={(e) => setMicrobeCode(e.target.value)}>
          <option value="">All Microbes</option>
          {microbes.map((m) => <option key={m.microbeId} value={m.microbeCode}>{toTitleCase(m.microbeName)} ({m.microbeCode})</option>)}
        </select>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">From</label>
          <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-500">To</label>
          <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <p className="text-center py-10 text-gray-400">Loading…</p>
      ) : ledger.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-2">📜</div>
          <p className="text-sm">No transactions found for this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {['', 'Date', 'Microbe', 'Container', 'Qty (kg)', 'CFU/g', 'Batch / Ref', 'Detail', 'Status'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide bg-gray-50 border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ledger.map((e, i) => (
                <tr key={`${e.type}-${e.ref_id}-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2.5 border-b border-gray-100">
                    {e.type === 'INWARD'
                      ? <ArrowDownCircle size={16} className="text-green-600" />
                      : <ArrowUpCircle size={16} className="text-red-600" />}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-gray-700 whitespace-nowrap">{fmtDateTime(e.date)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 font-semibold text-gray-900">
                    {e.microbe_name}
                    <div className="text-[10px] text-gray-400 font-normal">{e.microbe_code}</div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 font-mono text-gray-700">{e.container_code}</td>
                  <td className={`px-3 py-2.5 border-b border-gray-100 font-bold ${e.qty_kg >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {e.qty_kg >= 0 ? '+' : ''}{Number(e.qty_kg).toFixed(3)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-gray-700">{fmtCfu(e.cfu_per_g)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 font-mono text-gray-700">{e.batch_code || '—'}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-gray-500">
                    {e.type === 'OUTWARD' ? `${e.product_name || ''}${e.customer_name ? ` → ${e.customer_name}` : ''}` : (e.location || '—')}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${
                      e.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 ring-amber-200'
                      : e.type === 'INWARD' ? 'bg-blue-50 text-blue-700 ring-blue-200'
                      : 'bg-gray-100 text-gray-500 ring-gray-200'
                    }`}>{e.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
