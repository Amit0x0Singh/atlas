import { useState } from 'react'
import { Search, Filter, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import AuditFilterModal, { EMPTY_AUDIT_FILTERS } from './AuditFilterModal.jsx'
import AuditSortModal, { DEFAULT_AUDIT_SORT } from './AuditSortModal.jsx'

function countActiveFilters(f) {
  return Object.values(f).filter(v => (v ?? '').toString().trim()).length
}

/** Search + Sort by + Filter + Export in one row, above the table header — same toolbar as the other master tables. */
export default function AuditToolbar({ search, onSearchChange, filters, onFiltersChange, sort, onSortChange, userOptions, actionOptions, moduleOptions, tableOptions, onExport, exporting, resultCount }) {
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const activeFilterCount = countActiveFilters(filters)
  const sortIsDefault = sort.field === DEFAULT_AUDIT_SORT.field && sort.direction === DEFAULT_AUDIT_SORT.direction

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100 bg-white rounded-t-xl">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by record id…"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
        />
      </div>

      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
        {resultCount} {resultCount === 1 ? 'entry' : 'entries'}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant={sortIsDefault ? 'outline-gray' : 'outline'} size="sm" icon={ArrowUpDown} onClick={() => setShowSort(true)}>
          Sort by
        </Button>
        <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
          Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
        <Button variant="secondary" size="sm" icon={Download} loading={exporting} onClick={onExport}>
          Export
        </Button>
      </div>

      <AuditFilterModal open={showFilter} onClose={() => setShowFilter(false)} value={filters} onApply={onFiltersChange}
        userOptions={userOptions} actionOptions={actionOptions} moduleOptions={moduleOptions} tableOptions={tableOptions} />
      <AuditSortModal open={showSort} onClose={() => setShowSort(false)} value={sort} onApply={onSortChange} />
    </div>
  )
}

export { EMPTY_AUDIT_FILTERS, DEFAULT_AUDIT_SORT }
