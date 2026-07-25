import { Loader2, PackageX } from 'lucide-react'
import RmTableFilters from '../components/RmTableFilters.jsx'
import RmTableRow from '../components/RmTableRow.jsx'
import './RmTable.css'
import Pagination from '../../../../../../components/pagination/Pagination.jsx'

export default function RmTable({
  visibleItems, loading, error, page, limit, filters, uomOptions, filterType,
  onFilterChange, onClearFilters, onFilterType, onEdit, onDelete, onViewPacking, onRowClick, onPageChange, onLimitChange,
}) {
  const paginated = visibleItems.slice((page - 1) * limit, page * limit)

  return (
    <div className="space-y-4">
      <RmTableFilters
        filters={filters}
        uomOptions={uomOptions}
        filterType={filterType}
        resultCount={visibleItems.length}
        onFilterChange={onFilterChange}
        onFilterType={onFilterType}
        onClearFilters={onClearFilters}
      />

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Item</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">UOM</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Opr. UOM</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Pack Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">State</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Con. Required</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Con. Factor</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Low / High Stock</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Added On</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-gray-400">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                    Loading items…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-red-500">{error}</td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-14 text-center text-gray-400">
                    <PackageX size={26} className="mx-auto mb-2 text-gray-300" />
                    No items found. Click "Add New Item" to start.
                  </td>
                </tr>
              ) : paginated.map(item => (
                <RmTableRow
                  key={item.kind === 'packing' ? `pm-${item.id}` : item.itemCode}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onViewPacking={onViewPacking}
                  onRowClick={onRowClick}
                />
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-3 pt-1 border-t border-gray-100">
          <Pagination page={page} total={visibleItems.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
        </div>
      </div>
    </div>
  )
}
