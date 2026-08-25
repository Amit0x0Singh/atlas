import { useMemo, useState } from 'react'
import { Search, Filter, ArrowUpDown, Download, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { Button, ColumnsMenu } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import { useMicrobeSuggestions } from '../../../../../hooks/masters/useMicrobes.js'
import { useMicrobialHistory } from '../../../../../hooks/microbial/useMicrobialHistory.js'
import { useColumnPreferences } from '../../../../../hooks/useColumnPreferences.js'
import { fmtCfu, fmtDateTime } from '../../utils/format.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { exportCsv } from '../../../dashboard/utils/exportCsv.js'
import HistoryFilterModal, { EMPTY_HISTORY_FILTERS } from './HistoryFilterModal.jsx'
import HistorySortModal, { DEFAULT_HISTORY_SORT } from './HistorySortModal.jsx'

function countActiveFilters(f) {
  return Object.values(f).filter((v) => (v ?? '').toString().trim()).length
}

// Resizable/toggleable columns — same drag-handle + Columns-menu mechanism
// as the Stock Ledger / Inward History tables. The leading type-icon column
// stays fixed width, like those tables' own fixed leading columns.
const COLUMN_DEFS = [
  { key: 'date',      label: 'Date',        defaultWidth: 150 },
  { key: 'microbe',   label: 'Microbe',     defaultWidth: 180 },
  { key: 'container', label: 'Container',   defaultWidth: 150 },
  { key: 'qty',       label: 'Qty (kg)',    defaultWidth: 110, align: 'right' },
  { key: 'cfu',       label: 'CFU/g',       defaultWidth: 110 },
  { key: 'batch',     label: 'Batch / Ref', defaultWidth: 150 },
  { key: 'detail',    label: 'Detail',      defaultWidth: 180 },
  { key: 'status',    label: 'Status',      defaultWidth: 100 },
]
const TYPE_COL_WIDTH = 40

export default function HistoryTab() {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_HISTORY_FILTERS)
  const [sort, setSort] = useState(DEFAULT_HISTORY_SORT)
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)

  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('microbial-transaction-history', COLUMN_DEFS)

  const { data: microbes = [] } = useMicrobeSuggestions()
  const apiFilters = useMemo(() => ({
    microbe_code: filters.microbeCode || undefined,
    from: filters.from || undefined,
    to: filters.to || undefined,
  }), [filters])
  const { data: ledger = [], isLoading } = useMicrobialHistory(apiFilters)
  const activeFilterCount = countActiveFilters(filters)
  const sortIsDefault = sort.field === DEFAULT_HISTORY_SORT.field && sort.direction === DEFAULT_HISTORY_SORT.direction

  const filtered = useMemo(() => {
    if (!search) return ledger
    const q = search.toLowerCase()
    return ledger.filter((e) =>
      e.microbe_name?.toLowerCase().includes(q) ||
      e.microbe_code?.toLowerCase().includes(q) ||
      e.container_code?.toLowerCase().includes(q) ||
      e.batch_code?.toLowerCase().includes(q)
    )
  }, [ledger, search])

  const sorted = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sort.field === 'microbe') return dir * (a.microbe_name || '').localeCompare(b.microbe_name || '')
      if (sort.field === 'qty') return dir * (Math.abs(a.qty_kg) - Math.abs(b.qty_kg))
      if (sort.field === 'status') return dir * (a.status || '').localeCompare(b.status || '')
      return dir * (new Date(a.date) - new Date(b.date)) // 'date'
    })
  }, [filtered, sort])

  const handleExport = () => exportCsv('microbial_transaction_history.csv', sorted, [
    { label: 'Date', value: (e) => fmtDateTime(e.date) },
    { label: 'Type', value: (e) => e.type },
    { label: 'Microbe', value: (e) => toTitleCase(e.microbe_name) },
    { label: 'Code', value: (e) => e.microbe_code },
    { label: 'Container', value: (e) => e.container_code },
    { label: 'Qty (kg)', value: (e) => e.qty_kg },
    { label: 'CFU/g', value: (e) => e.cfu_per_g },
    { label: 'Batch / Ref', value: (e) => e.batch_code || '' },
    { label: 'Detail', value: (e) => e.type === 'OUTWARD' ? `${e.product_name || ''}${e.customer_name ? ` -> ${e.customer_name}` : ''}` : (e.location || '') },
    { label: 'Status', value: (e) => e.status },
  ])

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search microbe, container, batch…"
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
          />
        </div>

        <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
          {sorted.length} {sorted.length === 1 ? 'transaction' : 'transactions'}
        </span>

        <div className="flex items-center gap-2 ml-auto">
          <Button variant={sortIsDefault ? 'outline-gray' : 'outline'} size="sm" icon={ArrowUpDown} onClick={() => setShowSort(true)}>
            Sort by
          </Button>
          <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
            Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
          </Button>
          <Can permission="microbial.reports.export">
            <Button variant="secondary" size="sm" icon={Download} onClick={handleExport}>Export</Button>
          </Can>
        </div>
      </div>

      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>

      {isLoading ? (
        <p className="text-center py-10 text-gray-400">Loading…</p>
      ) : !sorted.length ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-2">📜</div>
          <p className="text-sm">No transactions found for this filter.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs" style={{ tableLayout: 'fixed' }}>
            <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
              <tr className="text-gray-600">
                <th style={{ width: TYPE_COL_WIDTH }} className="px-3 py-2.5" />
                {visibleColumns.map((c) => (
                  <th
                    key={c.key}
                    style={{ width: columnWidths[c.key] }}
                    className={`relative px-3 py-2.5 font-semibold uppercase tracking-wide select-none ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                  >
                    {c.label}
                    <div
                      onMouseDown={startResize(c.key)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((e, i) => (
                <tr key={`${e.type}-${e.ref_id}-${i}`} className="border-b border-gray-100 hover:bg-blue-50/40 transition">
                  <td className="px-3 py-2.5">
                    {e.type === 'INWARD'
                      ? <ArrowDownCircle size={16} className="text-green-600" />
                      : <ArrowUpCircle size={16} className="text-red-600" />}
                  </td>
                  {columnVisibility.date && <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap overflow-hidden">{fmtDateTime(e.date)}</td>}
                  {columnVisibility.microbe && (
                    <td className="px-3 py-2.5 font-semibold text-gray-900 truncate">
                      {e.microbe_name}
                      <div className="text-[10px] text-gray-400 font-normal">{e.microbe_code}</div>
                    </td>
                  )}
                  {columnVisibility.container && <td className="px-3 py-2.5 font-mono text-gray-700 truncate">{e.container_code}</td>}
                  {columnVisibility.qty && (
                    <td className={`px-3 py-2.5 text-right font-bold overflow-hidden ${e.qty_kg >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {e.qty_kg >= 0 ? '+' : ''}{Number(e.qty_kg).toFixed(3)}
                    </td>
                  )}
                  {columnVisibility.cfu && <td className="px-3 py-2.5 text-gray-700 overflow-hidden">{fmtCfu(e.cfu_per_g)}</td>}
                  {columnVisibility.batch && <td className="px-3 py-2.5 font-mono text-gray-700 truncate">{e.batch_code || '—'}</td>}
                  {columnVisibility.detail && (
                    <td className="px-3 py-2.5 text-gray-500 truncate">
                      {e.type === 'OUTWARD' ? `${e.product_name || ''}${e.customer_name ? ` → ${e.customer_name}` : ''}` : (e.location || '—')}
                    </td>
                  )}
                  {columnVisibility.status && (
                    <td className="px-3 py-2.5 overflow-hidden">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 ring-inset ${
                        e.status === 'PARTIAL' ? 'bg-amber-50 text-amber-700 ring-amber-200'
                        : e.type === 'INWARD' ? 'bg-blue-50 text-blue-700 ring-blue-200'
                        : 'bg-gray-100 text-gray-500 ring-gray-200'
                      }`}>{e.status}</span>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <HistoryFilterModal open={showFilter} onClose={() => setShowFilter(false)} value={filters} onApply={setFilters} microbes={microbes} />
      <HistorySortModal open={showSort} onClose={() => setShowSort(false)} value={sort} onApply={setSort} />
    </div>
  )
}
