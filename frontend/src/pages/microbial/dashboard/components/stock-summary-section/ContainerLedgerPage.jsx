import { useMemo, useState } from 'react'
import { Search, Filter, Download, PlayCircle, Info } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import { stockStatusBadgeCls, fmtDate } from '../../../transaction/utils/format.js'
import { exportCsv } from '../../utils/exportCsv.js'
import { useReactivateContainer } from '../../../../../hooks/microbial/useMicrobialStorage.js'
import { formatMeasurementString } from '../../../../../utils/measurement/formatMeasurement.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import ContainerDetailModal from '../shared/ContainerDetailModal.jsx'
import ContainerLedgerFilterModal, { EMPTY_CONTAINER_LEDGER_FILTERS } from './ContainerLedgerFilterModal.jsx'

function countActiveFilters(f) {
  return Object.values(f).filter((v) => (v ?? '').toString().trim()).length
}

export default function ContainerLedgerPage({ rows, loading, filterSeed }) {
  const [search, setSearch] = useState(filterSeed?.microbeCode || '')
  const [filters, setFilters] = useState({ ...EMPTY_CONTAINER_LEDGER_FILTERS, typeFilter: filterSeed?.microbeType || '' })
  const [showFilter, setShowFilter] = useState(false)
  const [selectedContainer, setSelectedContainer] = useState(null)
  const reactivate = useReactivateContainer()

  const types = useMemo(() => [...new Set(rows.map((r) => r.microbe_type))], [rows])
  const statuses = ['Fresh', 'Moderate', 'Near Expiry', 'Expired', 'Exhausted', 'Inactive']
  const activeFilterCount = countActiveFilters(filters)

  const filtered = useMemo(() => rows.filter((r) => {
    if (filters.typeFilter && r.microbe_type !== filters.typeFilter) return false
    if (filters.statusFilter === 'Inactive' && !r.inactive) return false
    if (filters.statusFilter && filters.statusFilter !== 'Inactive' && r.status !== filters.statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      if (!r.microbe_name.toLowerCase().includes(q) && !r.microbe_code.toLowerCase().includes(q) && !r.container_code.toLowerCase().includes(q)) return false
    }
    return true
  }), [rows, search, filters])

  const handleExport = () => exportCsv('container_ledger.csv', filtered, [
    { label: 'Container', value: (r) => r.container_code },
    { label: 'Microbe', value: (r) => toTitleCase(r.microbe_name) },
    { label: 'Type', value: (r) => r.microbe_type },
    { label: 'Location', value: (r) => r.inactive ? r.inactive_location : r.location },
    { label: 'Batches', value: (r) => r.batch_count },
    { label: 'Balance', value: (r) => formatMeasurementString(r.balance_kg, 'KG') },
    { label: 'Total In', value: (r) => formatMeasurementString(r.total_in_kg, 'KG') },
    { label: 'Total Out', value: (r) => formatMeasurementString(r.total_out_kg, 'KG') },
    { label: 'Next Expiry', value: (r) => r.next_expiry ? fmtDate(r.next_expiry) : '' },
    { label: 'Status', value: (r) => (r.inactive ? 'Inactive' : r.status) },
  ])

  const handleReactivate = async (r) => {
    if (!confirm(`Reactivate ${r.container_code}? You'll need to assign it a new storage slot via a new inward entry.`)) return
    try { await reactivate.mutateAsync(r.container_id) } catch (err) { alert(err.message) }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-base font-bold text-gray-900">🗃️ Container Ledger</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {filterSeed?.microbeCode && <>Filtered for <b className="text-gray-600">{filterSeed.microbeCode}</b> · </>}
          Includes exhausted &amp; inactive container history
        </p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search container, microbe…"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
            {filtered.length} {filtered.length === 1 ? 'container' : 'containers'}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
              Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
            <Can permission="microbial.reports.export">
              <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>
            </Can>
          </div>
        </div>

        {loading ? (
          <p className="text-center py-10 text-gray-400">Loading…</p>
        ) : !filtered.length ? (
          <div className="text-center py-10 text-gray-400">
            <div className="text-3xl mb-2">🗃️</div>
            <p className="text-sm">No containers match.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
                <tr className="text-gray-600">
                  {['Container', 'Microbe', 'Type', 'Location', 'Batches', 'Balance', 'Total In', 'Total Out', 'Next Expiry', 'Status', ''].map((h) => (
                    <th key={h} className="text-left px-3 py-2.5 font-semibold uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.container_id} className={`border-b border-gray-100 ${r.inactive ? 'bg-gray-50/70' : 'hover:bg-blue-50/40'} transition`}>
                    <td className="px-3 py-2 font-mono text-gray-700">
                      {r.container_code}
                      {r.inactive && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[9px] font-bold align-middle">⏸ INACTIVE</span>}
                    </td>
                    <td className="px-3 py-2 text-gray-800">{toTitleCase(r.microbe_name)}</td>
                    <td className="px-3 py-2"><span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">{r.microbe_type}</span></td>
                    <td className="px-3 py-2 text-gray-500 font-mono">{r.inactive ? `${r.inactive_location || '—'} (freed)` : (r.location || '—')}</td>
                    <td className="px-3 py-2 text-center text-gray-700">{r.batch_count}</td>
                    <td className="px-3 py-2 font-bold text-gray-900">{formatMeasurementString(r.balance_kg, 'KG')}</td>
                    <td className="px-3 py-2 text-gray-700">{formatMeasurementString(r.total_in_kg, 'KG')}</td>
                    <td className="px-3 py-2 text-gray-700">{formatMeasurementString(r.total_out_kg, 'KG')}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtDate(r.next_expiry)}</td>
                    <td className="px-3 py-2"><span className={stockStatusBadgeCls(r.status)}>{r.status}</span></td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <Button variant="outline-gray" size="xs" icon={Info} onClick={() => setSelectedContainer(r)}>Details</Button>
                        {r.inactive && (
                          <Button variant="outline-gray" size="xs" icon={PlayCircle} disabled={reactivate.isPending} onClick={() => handleReactivate(r)}>Reactivate</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ContainerLedgerFilterModal open={showFilter} onClose={() => setShowFilter(false)} value={filters} onApply={setFilters} types={types} statuses={statuses} />
      <ContainerDetailModal container={selectedContainer} onClose={() => setSelectedContainer(null)} />
    </div>
  )
}
