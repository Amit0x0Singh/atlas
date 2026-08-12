import { Pencil, Trash2, Search } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

import { toTitleCase } from '../../../../../utils/textDisplay.js'
export default function MicrobeList({ paginated, total, loading, search, page, limit, hasStock, onSearch, onEdit, onDelete, onPageChange, onLimitChange }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
        <span className="text-sm text-gray-500">{total} microbe{total !== 1 ? 's' : ''} registered</span>
        <div className="relative w-56">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            placeholder="Search name or code..."
            value={search}
            onChange={e => onSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-8 pr-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-10 text-sm">Loading...</p>
      ) : total === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-sm font-medium">No microbes found. Add one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-700 w-10">#</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Microbe Name</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">UOM</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Date Added</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Stock</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((m, i) => {
                const inStock = hasStock(m.microbeCode)
                return (
                  <tr key={m.microbeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * limit + i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{toTitleCase(m.microbeName)}</td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200 px-2 py-0.5 rounded-md">{m.microbeCode}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{m.uom ? m.uom.toUpperCase() : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${
                        inStock ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
                      }`}>
                        {inStock ? 'Has stock' : 'No stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(m)} />
                        {inStock ? (
                          <span className="text-xs text-gray-400 self-center ml-1">Cannot delete (has stock)</span>
                        ) : (
                          <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(m.microbeId, m.microbeName)} />
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-3">
        <Pagination page={page} total={total} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
