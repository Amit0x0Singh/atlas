import { Search, X } from 'lucide-react'
import { Button, IconButton } from '../../../../../../components/ui'

const FILTERS = ['ALL', 'PACK', 'BULK', 'PACKING']

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

export default function RmTableFilters({ filters, uomOptions, filterType, resultCount, onFilterChange, onFilterType, onClearFilters }) {
  const hasActiveFilters = filterType !== 'ALL' || Object.values(filters).some(v => v.trim())

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-[18px] py-3.5 mb-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
          <label className={label}>Inventory UOM</label>
          <select value={filters.uom} onChange={e => onFilterChange('uom', e.target.value)} className={`${inputCls} cursor-pointer`}>
            <option value="">All UOMs</option>
            {uomOptions.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Type</label>
          <div className="flex border border-gray-200 rounded-lg overflow-hidden h-[35px]">
            {FILTERS.map(t => (
              <button key={t} onClick={() => onFilterType(t)}
                className={`flex-1 text-[12px] font-semibold transition whitespace-nowrap ${filterType === t ? 'bg-blue-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
                {t}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label}>Packing Spec</label>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="e.g. 3 PLY, HDPE, Blue…" value={filters.packingSpec}
              onChange={e => onFilterChange('packingSpec', e.target.value)}
              className={`${inputCls} pl-8`} />
          </div>
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
          {filters.uom && <FilterChip label={`Inventory UOM: ${filters.uom}`} onRemove={() => onFilterChange('uom', '')} />}
          {filterType !== 'ALL' && <FilterChip label={`Type: ${filterType}`} onRemove={() => onFilterType('ALL')} />}
          {filters.packingSpec && <FilterChip label={`Packing Spec: "${filters.packingSpec}"`} onRemove={() => onFilterChange('packingSpec', '')} />}
        </div>
      )}
    </div>
  )
}
