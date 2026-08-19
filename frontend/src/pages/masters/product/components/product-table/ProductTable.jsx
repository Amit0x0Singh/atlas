import { useMemo } from 'react'
import { Pencil, Trash2, Loader2, PackageX } from 'lucide-react'
import { IconButton, ColumnsMenu } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { useColumnPreferences } from '../../../../../hooks/useColumnPreferences.js'
import { Can } from '../../../../../components/common/Can.jsx'
import ProductToolbar from './ProductToolbar.jsx'

const STATE_BADGE = {
  solid:  'bg-stone-50 text-stone-700 ring-stone-200',
  liquid: 'bg-sky-50 text-sky-700 ring-sky-200',
  gas:    'bg-violet-50 text-violet-700 ring-violet-200',
}

// Resizable columns — same drag-handle mechanism as the other master tables.
// "Actions" stays a fixed width since it only holds icons.
const COLUMN_DEFS = [
  { key: 'productCode', label: 'Product Code', defaultWidth: 150 },
  { key: 'productName', label: 'Product Name', defaultWidth: 240 },
  { key: 'uom',          label: 'UOM',          defaultWidth: 90  },
  { key: 'state',        label: 'State',        defaultWidth: 110 },
  { key: 'plant',        label: 'Plant',        defaultWidth: 160 },
  { key: 'totalRecipe',  label: 'Total Recipe', defaultWidth: 120 },
]
const ACTIONS_COL_WIDTH = 90

// `items` is already the current page's rows (filtering + pagination happen
// server-side) — `total` is the server-reported match count. Sort is applied
// client-side to whatever page is currently loaded (see ProductSortModal).
export default function ProductTable({
  items, total, loading, page, limit, onEdit, onDelete, onRowClick, onPageChange, onLimitChange,
  search, onSearchChange, filters, onFiltersChange, sort, onSortChange, plantOptions, uomOptions, stateOptions, onExport, exporting,
}) {
  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('product-master', COLUMN_DEFS)

  const sortedItems = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      if (sort.field === 'productCode') return dir * (a.productCode || '').localeCompare(b.productCode || '')
      if (sort.field === 'totalRecipe') return dir * ((a.totalRecipe || 0) - (b.totalRecipe || 0))
      return dir * (a.productName || '').localeCompare(b.productName || '') // 'name'
    })
  }, [items, sort])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <ProductToolbar
        search={search} onSearchChange={onSearchChange}
        filters={filters} onFiltersChange={onFiltersChange}
        sort={sort} onSortChange={onSortChange}
        plantOptions={plantOptions} uomOptions={uomOptions} stateOptions={stateOptions}
        onExport={onExport} exporting={exporting}
        resultCount={total}
      />
      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
            <tr>
              {visibleColumns.map(c => (
                <th
                  key={c.key}
                  style={{ width: columnWidths[c.key] }}
                  className="relative text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap select-none"
                >
                  {c.label}
                  <div
                    onMouseDown={startResize(c.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                  />
                </th>
              ))}
              <th style={{ width: ACTIONS_COL_WIDTH }} className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-14 text-center text-gray-400">
                  <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                  Loading products…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-14 text-center text-gray-400">
                  <PackageX size={26} className="mx-auto mb-2 text-gray-300" />
                  No products found.
                </td>
              </tr>
            ) : sortedItems.map(item => (
              <tr key={item.productCode} className="group hover:bg-green-50/60 transition-colors cursor-pointer" onClick={() => onRowClick(item)}>
                {columnVisibility.productCode && <td className="px-4 py-3 font-mono text-green-700 font-medium truncate">{item.productCode}</td>}
                {columnVisibility.productName && <td className="px-4 py-3 text-gray-800 truncate">{toTitleCase(item.productName)}</td>}
                {columnVisibility.uom && <td className="px-4 py-3 text-gray-500 truncate">{item.uom ? item.uom.toUpperCase() : '—'}</td>}
                {columnVisibility.state && (
                  <td className="px-4 py-3 overflow-hidden">
                    {item.state ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${STATE_BADGE[item.state.toLowerCase()] || 'bg-gray-100 text-gray-600 ring-gray-200'}`}>
                        {item.state.toUpperCase()}
                      </span>
                    ) : <span className="text-gray-300">—</span>}
                  </td>
                )}
                {columnVisibility.plant && <td className="px-4 py-3 text-gray-500 truncate">{item.plant?.length ? item.plant.join(', ') : '—'}</td>}
                {columnVisibility.totalRecipe && <td className="px-4 py-3 text-gray-500 truncate">{item.totalRecipe ?? 0}</td>}
                <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                    <Can permission="masters.product.update">
                      <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                    </Can>
                    <Can permission="masters.product.delete">
                      <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.productCode)} />
                    </Can>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 pb-3">
        <Pagination page={page} total={total} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
