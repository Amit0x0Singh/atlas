import { useMemo, useState } from 'react'
import { Search, Filter } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { stockStatusBadgeCls, fmtCfu, fmtDate } from '../../../transaction/utils/format.js'
import { formatMeasurementString } from '../../../../../utils/measurement/formatMeasurement.js'
import MicrobeWiseFilterModal, { EMPTY_MICROBE_WISE_FILTERS } from './MicrobeWiseFilterModal.jsx'

function countActiveFilters(f) {
  return Object.values(f).filter((v) => (v ?? '').toString().trim()).length
}

export default function MicrobeWiseTable({ rows, onViewContainers }) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_MICROBE_WISE_FILTERS)
  const [showFilter, setShowFilter] = useState(false)

  const types = useMemo(() => [...new Set(rows.map((r) => r.microbe_type))], [rows])
  const activeFilterCount = countActiveFilters(filters)

  const filtered = useMemo(() => rows.filter((r) => {
    if (filters.typeFilter && r.microbe_type !== filters.typeFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.microbe_name.toLowerCase().includes(q) && !r.microbe_code.toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, search, filters])

  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-3">🧬 Stock Summary — Microbe Wise</h2>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search microbe name or code…"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
            {filtered.length} {filtered.length === 1 ? 'microbe' : 'microbes'}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
              Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
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
              <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
                <tr className="text-gray-600">
                  {['Microbe', 'Code', 'Type', 'Containers', 'Balance', 'Batches', 'Avg CFU/g', 'Next Expiry', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={`${r.microbe_code}-${r.microbe_type}`} className="border-b border-gray-100 hover:bg-blue-50/40 transition">
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

      <MicrobeWiseFilterModal open={showFilter} onClose={() => setShowFilter(false)} value={filters} onApply={setFilters} types={types} />
    </div>
  )
}
