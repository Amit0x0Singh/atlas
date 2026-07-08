import { Pencil, Trash2, Search, Loader2, PackageX } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import './RmTable.css'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

const TRACKING_BADGE = {
  PACK: 'bg-blue-100 text-blue-700',
  BULK: 'bg-green-100 text-green-700',
}

const FILTERS = ['ALL', 'PACK', 'BULK']

export default function RmTable({ items, visibleItems, loading, error, page, limit, search, filterType, onSearch, onFilterType, onEdit, onDelete, onPageChange, onLimitChange }) {
  const paginated = visibleItems.slice((page - 1) * limit, page * limit)

  return (
    <>
      {/* Filter bar — always mounted/interactive, independent of loading state */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or code..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="border border-gray-300 rounded-lg pl-9 pr-4 py-2 w-72 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex border border-gray-300 rounded-lg overflow-hidden">
          {FILTERS.map(t => (
            <button key={t} onClick={() => onFilterType(t)}
              className={`px-4 py-2 text-sm font-medium transition ${filterType === t ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t}
            </button>
          ))}
        </div>
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
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Tracking Type</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Added On</th>
                <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-gray-400">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                    Loading items…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-red-500">{error}</td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-gray-400">
                    <PackageX size={26} className="mx-auto mb-2 text-gray-300" />
                    No items found. Click "Add New Item" to start.
                  </td>
                </tr>
              ) : paginated.map(item => (
                <tr key={item.itemCode} className="group hover:bg-blue-50/60 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-700 font-medium whitespace-nowrap">{item.itemCode}</td>
                  <td className="px-4 py-3 text-gray-800">{item.itemName}</td>
                  <td className="px-4 py-3">
                    <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs font-medium">{item.uom}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TRACKING_BADGE[item.trackingType || 'PACK']}`}>
                      {item.trackingType || 'PACK'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                      <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                      <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.itemCode)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {items.length} total items
          · {items.filter(i => (i.trackingType || 'PACK') === 'PACK').length} PACK
          · {items.filter(i => i.trackingType === 'BULK').length} BULK
        </div>
        <div className="px-4 pb-3">
          <Pagination page={page} total={visibleItems.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
        </div>
      </div>
    </>
  )
}
