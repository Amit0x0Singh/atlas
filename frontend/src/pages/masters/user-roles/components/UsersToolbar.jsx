import { useState } from 'react'
import { Search, Filter, ArrowUpDown, Download } from 'lucide-react'
import { Button } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import UsersFilterModal, { EMPTY_USER_FILTERS } from './UsersFilterModal.jsx'
import UsersSortModal, { DEFAULT_USER_SORT } from './UsersSortModal.jsx'

function countActiveFilters(f) {
  return Object.values(f).filter(v => (v ?? '').toString().trim()).length
}

/**
 * Single toolbar row above the users table: keyword search + Filter + Sort
 * by + Export, matching the reference layout (all four controls on one row,
 * Filter/Sort opening as centered popups rather than anchored dropdowns).
 */
export default function UsersToolbar({ search, onSearchChange, filters, onFiltersChange, sort, onSortChange, roles, onExport, resultCount }) {
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)
  const activeFilterCount = countActiveFilters(filters)
  const sortIsDefault = sort.field === DEFAULT_USER_SORT.field && sort.direction === DEFAULT_USER_SORT.direction

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
      <div className="relative flex-1 min-w-[200px]">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search by name, email, phone…"
          className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
        />
      </div>

      <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
        {resultCount} {resultCount === 1 ? 'user' : 'users'}
      </span>

      <div className="flex items-center gap-2 ml-auto">
        <Button variant={sortIsDefault ? 'outline-gray' : 'outline'} size="sm" icon={ArrowUpDown} onClick={() => setShowSort(true)}>
          Sort by
        </Button>
        <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
          Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
        </Button>
        <Can permission="admin.users.view">
          <Button variant="secondary" size="sm" icon={Download} onClick={onExport}>
            Export
          </Button>
        </Can>
      </div>

      <UsersFilterModal open={showFilter} onClose={() => setShowFilter(false)} value={filters} onApply={onFiltersChange} roles={roles} />
      <UsersSortModal open={showSort} onClose={() => setShowSort(false)} value={sort} onApply={onSortChange} />
    </div>
  )
}

export { EMPTY_USER_FILTERS, DEFAULT_USER_SORT }
