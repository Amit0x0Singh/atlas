import { Pencil, Trash2, Loader2, PackageX } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

const STATE_BADGE = {
  solid:  'bg-stone-50 text-stone-700 ring-stone-200',
  liquid: 'bg-sky-50 text-sky-700 ring-sky-200',
  gas:    'bg-violet-50 text-violet-700 ring-violet-200',
}

// `items` is already the current page's rows (filtering + pagination happen
// server-side) — `total` is the server-reported match count.
export default function ProductTable({ items, total, loading, page, limit, onEdit, onDelete, onRowClick, onPageChange, onLimitChange }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white">
            <tr>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Product Code</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Product Name</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">UOM</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">State</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Plant</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Total Recipe</th>
              <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-gray-400">
                  <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                  Loading products…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center text-gray-400">
                  <PackageX size={26} className="mx-auto mb-2 text-gray-300" />
                  No products found.
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.productCode} className="group hover:bg-green-50/60 transition-colors cursor-pointer" onClick={() => onRowClick(item)}>
                <td className="px-4 py-3 font-mono text-green-700 font-medium whitespace-nowrap">{item.productCode}</td>
                <td className="px-4 py-3 text-gray-800">{toTitleCase(item.productName)}</td>
                <td className="px-4 py-3 text-gray-500">{item.uom ? item.uom.toUpperCase() : '—'}</td>
                <td className="px-4 py-3">
                  {item.state ? (
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${STATE_BADGE[item.state.toLowerCase()] || 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                      {item.state.toUpperCase()}
                    </span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-4 py-3 text-gray-500">{item.plant?.length ? item.plant.join(', ') : '—'}</td>
                <td className="px-4 py-3 text-gray-500">{item.totalRecipe ?? 0}</td>
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                    <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.productCode)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {!loading && (
        <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-400">
          {total} product{total !== 1 ? 's' : ''}
        </div>
      )}
      <div className="px-4 pb-3">
        <Pagination page={page} total={total} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
