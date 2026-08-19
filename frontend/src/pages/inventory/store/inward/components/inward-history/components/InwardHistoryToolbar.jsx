import { useState } from 'react'
import { Search, Filter, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '../../../../../../../components/ui'
import { Can } from '../../../../../../../components/common/Can.jsx'
import InwardHistoryFilterModal, { EMPTY_INWARD_HISTORY_FILTERS } from './InwardHistoryFilterModal.jsx'
import InwardHistorySortModal, { DEFAULT_INWARD_HISTORY_SORT } from './InwardHistorySortModal.jsx'

function countActiveFilters(f) {
  return Object.values(f).filter(v => (v ?? '').toString().trim()).length
}

/** Search + Sort by + Filter + Export in one row, above the table header — same toolbar as Item/Product/Equipment Master. */
export default function InwardHistoryToolbar({ search, onSearchChange, filters, onFiltersChange, sort, onSortChange, suppliers, onExport, resultCount }) {
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const activeFilterCount = countActiveFilters(filters)
  const sortIsDefault = sort.field === DEFAULT_INWARD_HISTORY_SORT.field && sort.direction === DEFAULT_INWARD_HISTORY_SORT.direction

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search item, code, lot, invoice…"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
        />
      </div>

      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
        {resultCount} {resultCount === 1 ? 'invoice' : 'invoices'}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant={sortIsDefault ? 'outline-gray' : 'outline'} size="sm" icon={ArrowUpDown} onClick={() => setShowSort(true)}>
          Sort by
        </Button>
        <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
          Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
        <Can permission="inventory.reports.export">
          <Button variant="secondary" size="sm" icon={Download} onClick={onExport}>
            Export
          </Button>
        </Can>
      </div>

      <InwardHistoryFilterModal open={showFilter} onClose={() => setShowFilter(false)} value={filters} onApply={onFiltersChange} suppliers={suppliers} />
      <InwardHistorySortModal open={showSort} onClose={() => setShowSort(false)} value={sort} onApply={onSortChange} />
    </div>
  )
}

export { EMPTY_INWARD_HISTORY_FILTERS, DEFAULT_INWARD_HISTORY_SORT }
