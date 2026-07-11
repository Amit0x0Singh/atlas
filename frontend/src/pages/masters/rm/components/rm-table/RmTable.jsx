import { Pencil, Trash2, Search, Loader2, PackageX, Eye, X } from 'lucide-react'
import { Button, IconButton } from '../../../../../components/ui'
import { getChips, Chip } from '../../../packing/components/packing-constants/packingConstants.jsx'
import './RmTable.css'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

const TRACKING_BADGE = {
  PACK: 'bg-blue-100 text-blue-700',
  BULK: 'bg-green-100 text-green-700',
}

const FILTERS = ['ALL', 'PACK', 'BULK', 'PACKING']

const label   = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1'
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400'

function FilterChip({ label: text, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[11px] font-semibold">
      {text}
      <IconButton icon={X} size="xs" onClick={onRemove} className="text-blue-300 hover:text-blue-500" />
    </span>
  )
}

export default function RmTable({
  rmTotal, packingTotal, packCount, bulkCount,
  visibleItems, loading, error, page, limit, filters, uomOptions, filterType,
  onFilterChange, onClearFilters, onFilterType, onEdit, onDelete, onViewPacking, onPageChange, onLimitChange,
}) {
  const paginated = visibleItems.slice((page - 1) * limit, page * limit)
  const hasActiveFilters = filterType !== 'ALL' || Object.values(filters).some(v => v.trim())

  return (
    <>
      {/* Filter bar — always mounted/interactive, independent of loading state */}
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
            <label className={label}>UOM</label>
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
            {visibleItems.length} {visibleItems.length === 1 ? 'record' : 'records'} found
          </span>
          {hasActiveFilters && (
            <Button variant="danger" size="sm" onClick={onClearFilters}>Clear Filters</Button>
          )}
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
            {filters.itemCode && <FilterChip label={`Item Code: "${filters.itemCode}"`} onRemove={() => onFilterChange('itemCode', '')} />}
            {filters.itemName && <FilterChip label={`Item Name: "${filters.itemName}"`} onRemove={() => onFilterChange('itemName', '')} />}
            {filters.uom && <FilterChip label={`UOM: ${filters.uom}`} onRemove={() => onFilterChange('uom', '')} />}
            {filterType !== 'ALL' && <FilterChip label={`Type: ${filterType}`} onRemove={() => onFilterType('ALL')} />}
            {filters.packingSpec && <FilterChip label={`Packing Spec: "${filters.packingSpec}"`} onRemove={() => onFilterChange('packingSpec', '')} />}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white">
              <tr>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Item Code</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Item Name</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">UOM</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Type</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Packing Spec</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Added On</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                    Loading items…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-red-500">{error}</td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-gray-400">
                    <PackageX size={26} className="mx-auto mb-2 text-gray-300" />
                    No items found. Click "Add New Item" to start.
                  </td>
                </tr>
              ) : paginated.map(item => {
                const isPacking = item.kind === 'packing'
                return (
                  <tr key={isPacking ? `pm-${item.id}` : item.itemCode} className="group hover:bg-blue-50/60 transition-colors">
                    <td className="px-4 py-3 font-mono text-blue-700 font-medium whitespace-nowrap">{item.itemCode}</td>
                    <td className="px-4 py-3 text-gray-800">{item.itemName}</td>
                    <td className="px-4 py-3">
                      <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs font-medium">{item.uom}</span>
                    </td>
                    <td className="px-4 py-3">
                      {isPacking ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">PACKING</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TRACKING_BADGE[item.trackingType || 'PACK']}`}>
                          {item.trackingType || 'PACK'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      {isPacking ? (
                        <div className="flex flex-wrap items-center gap-1">
                          {item.subType && (
                            <span className="text-[11px] font-semibold text-violet-600 mr-1 whitespace-nowrap">{item.subType}</span>
                          )}
                          {getChips(item).length > 0
                            ? getChips(item).map((c, i) => <Chip key={i} label={c.label} color={c.color} italic={c.italic} />)
                            : <span className="text-xs text-gray-300 italic">No spec recorded</span>}
                        </div>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        {isPacking ? (
                          <IconButton icon={Eye} tooltip="View in Packing Materials" onClick={onViewPacking} />
                        ) : (
                          <>
                            <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                            <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.itemCode)} />
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {rmTotal} raw material item{rmTotal !== 1 ? 's' : ''} ({packCount} PACK · {bulkCount} BULK) · {packingTotal} packing material item{packingTotal !== 1 ? 's' : ''}
        </div>
        <div className="px-4 pb-3">
          <Pagination page={page} total={visibleItems.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
        </div>
      </div>
    </>
  )
}
