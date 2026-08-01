import { Search, X } from 'lucide-react'
import { Button, IconButton } from '../../../../../../components/ui'

const label    = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1'
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400'

function FilterChip({ label: text, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[11px] font-semibold">
      {text}
      <IconButton icon={X} size="xs" onClick={onRemove} className="text-blue-300 hover:text-blue-500" />
    </span>
  )
}

export default function RmTableFilters({ filters, resultCount, onFilterChange, onClearFilters }) {
  const hasActiveFilters = Object.values(filters).some(v => v.trim())

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-[18px] py-3.5 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={label}>Item Code</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search item code…" value={filters.itemCode}
              onChange={e => onFilterChange('itemCode', e.target.value)}
              className={`${inputCls} pl-8`} />
          </div>
        </div>
        <div>
          <label className={label}>Item Name</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search item name…" value={filters.itemName}
              onChange={e => onFilterChange('itemName', e.target.value)}
              className={`${inputCls} pl-8`} />
          </div>
        </div>
        <div>
          <label className={label}>Conversion Required</label>
          <select value={filters.conversionRequired} onChange={e => onFilterChange('conversionRequired', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">All</option>
            <option value="YES">Yes</option>
            <option value="NO">No</option>
          </select>
        </div>
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1" />
        <span className={`text-[12px] font-semibold whitespace-nowrap ${hasActiveFilters ? 'text-blue-600' : 'text-gray-400'}`}>
          {resultCount} {resultCount === 1 ? 'record' : 'records'} found
        </span>
        {hasActiveFilters && (
          <Button variant="danger" size="sm" onClick={onClearFilters}>Clear Filters</Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
          {filters.itemCode && <FilterChip label={`Item Code: "${filters.itemCode}"`} onRemove={() => onFilterChange('itemCode', '')} />}
          {filters.itemName && <FilterChip label={`Item Name: "${filters.itemName}"`} onRemove={() => onFilterChange('itemName', '')} />}
          {filters.conversionRequired && <FilterChip label={`Conversion Required: ${filters.conversionRequired === 'YES' ? 'Yes' : 'No'}`} onRemove={() => onFilterChange('conversionRequired', '')} />}
        </div>
      )}
    </div>
  )
}
