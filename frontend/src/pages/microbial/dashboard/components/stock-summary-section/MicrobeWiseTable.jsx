import { useMemo, useState } from 'react'
import { stockStatusBadgeCls, fmtCfu, fmtDate } from '../../../transaction/utils/format.js'
import { formatMeasurementString } from '../../../../../utils/measurement/formatMeasurement.js'

export default function MicrobeWiseTable({ rows, onViewContainers }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const types = useMemo(() => [...new Set(rows.map((r) => r.microbe_type))], [rows])
  const filtered = useMemo(() => rows.filter((r) => {
    if (typeFilter && r.microbe_type !== typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.microbe_name.toLowerCase().includes(q) && !r.microbe_code.toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, search, typeFilter])

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-slate-800 text-white flex items-center justify-between flex-wrap gap-2">
        <span className="text-xs font-bold">🧬 Stock Summary — Microbe Wise</span>
        <div className="flex gap-2">
          <input
            className="px-2.5 py-1.5 rounded-md bg-white/10 border border-white/30 text-white placeholder-white/60 text-xs outline-none w-[160px]"
            placeholder="Filter microbe..." value={search} onChange={(e) => setSearch(e.target.value)}
          />
          <select className="px-2.5 py-1.5 rounded-md bg-white/10 border border-white/30 text-white text-xs outline-none" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="" className="text-gray-900">All Types</option>
            {types.map((t) => <option key={t} value={t} className="text-gray-900">{t}</option>)}
          </select>
        </div>
      </div>

      {!filtered.length ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">🧬</div>
          <p className="text-sm">No stock matches.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>{['Microbe', 'Code', 'Type', 'Containers', 'Balance', 'Batches', 'Avg CFU/g', 'Next Expiry', 'Status', ''].map((h) => (
                <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide bg-gray-50 border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={`${r.microbe_code}-${r.microbe_type}`} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-bold text-gray-900">{r.microbe_name}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{r.microbe_code}</td>
                  <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">{r.microbe_type}</span></td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.container_count}</td>
                  <td className="px-3 py-2 font-bold text-gray-900">{formatMeasurementString(r.total_balance_kg, 'KG')}</td>
                  <td className="px-3 py-2 text-center text-gray-700">{r.batch_count}</td>
                  <td className="px-3 py-2 font-mono text-gray-600">{fmtCfu(r.avg_cfu_per_g)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtDate(r.next_expiry)}</td>
                  <td className="px-3 py-2"><span className={stockStatusBadgeCls(r.status)}>{r.status}</span></td>
                  <td className="px-3 py-2">
                    <button type="button" className="text-blue-600 hover:underline font-semibold" onClick={() => onViewContainers(r.microbe_code, r.microbe_type)}>Containers</button>
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
