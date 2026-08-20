import { useState } from 'react'
import { Search, Filter, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import GateFilterModal, { EMPTY_GATE_FILTERS } from './GateFilterModal.jsx'
import GateSortModal, { DEFAULT_GATE_SORT } from './GateSortModal.jsx'

function countActiveFilters(f) {
  return Object.entries(f).filter(([k, v]) => k !== 'search' && (v ?? '').toString().trim()).length
}

/**
 * Search + Sort by + Filter + Export in one row, above the table header —
 * same toolbar as the other tables. Replaces the old always-expanded
 * GateFilterBar; `filters` still carries `search` alongside the rest (see
 * GateEntry.jsx's handleFilterChange, which debounces search/invoice_no) —
 * this component only changes the presentation, not that wiring.
 */
export default function GateToolbar({ filters, onChange, onClear, sort, onSortChange, onExport, total }) {
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const searchLabel = 'Supplier / Receiver Name'
  const activeFilterCount = countActiveFilters(filters)
  const sortIsDefault = sort.field === DEFAULT_GATE_SORT.field && sort.direction === DEFAULT_GATE_SORT.direction

  const applyFilterSubset = (subset) => {
    Object.entries(subset).forEach(([k, v]) => onChange(k, v))
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-white border border-gray-200 rounded-xl mb-4">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={filters.search}
          onChange={e => onChange('search', e.target.value)}
          placeholder={`Search by ${searchLabel.toLowerCase()}…`}
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
        />
      </div>

      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
        {total} {total === 1 ? 'record' : 'records'}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant={sortIsDefault ? 'outline-gray' : 'outline'} size="sm" icon={ArrowUpDown} onClick={() => setShowSort(true)}>
          Sort by
        </Button>
        <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
          Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
        <Can permission="gate.reports.export">
          <Button variant="secondary" size="sm" icon={Download} onClick={onExport}>
            Export
          </Button>
        </Can>
      </div>

      <GateFilterModal open={showFilter} onClose={() => setShowFilter(false)} value={filters} onApply={applyFilterSubset} />
      <GateSortModal open={showSort} onClose={() => setShowSort(false)} value={sort} onApply={onSortChange} />
    </div>
  )
}

export { EMPTY_GATE_FILTERS, DEFAULT_GATE_SORT }
