import { useState } from 'react'
import { Loader2, PackageX } from 'lucide-react'
import RmTableRow from '../components/RmTableRow.jsx'
import RmMasterToolbar from '../components/RmMasterToolbar.jsx'
import './RmTable.css'
import Pagination from '../../../../../../components/pagination/Pagination.jsx'

// Resizable columns — same drag-handle mechanism as the User Roles / Raw
// Materials tables. "Actions" stays a fixed width since it only holds icons.
const COLUMN_DEFS = [
  { key: 'item',        label: 'Item',           defaultWidth: 208 },
  { key: 'invUom',      label: 'Inv. UOM',        defaultWidth: 80  },
  { key: 'oprUom',      label: 'Opr. UOM',        defaultWidth: 80  },
  { key: 'packType',    label: 'Pack Type',       defaultWidth: 96  },
  { key: 'category',    label: 'Category',        defaultWidth: 192 },
  { key: 'state',       label: 'State',           defaultWidth: 80  },
  { key: 'conRequired', label: 'Con. Required',   defaultWidth: 96  },
  { key: 'conFactor',   label: 'Con. Factor',     defaultWidth: 80  },
  { key: 'reorderLevel',label: 'Re-order Level',  defaultWidth: 112 },
]
const ACTIONS_COL_WIDTH = 80
const MIN_COL_WIDTH = 60

export default function RmTable({
  visibleItems, loading, error, page, limit,
  search, onSearchChange, filters, onFiltersChange, sort, onSortChange, categories, subCategories, onExport,
  onEdit, onDelete, onRowClick, onPageChange, onLimitChange,
}) {
  const paginated = visibleItems.slice((page - 1) * limit, page * limit)

  const [columnWidths, setColumnWidths] = useState(() =>
    Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultWidth])))

  function startResize(key) {
    return (e) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = columnWidths[key]
      function onMove(ev) {
        setColumnWidths(w => ({ ...w, [key]: Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX)) }))
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <RmMasterToolbar
          search={search} onSearchChange={onSearchChange}
          filters={filters} onFiltersChange={onFiltersChange}
          sort={sort} onSortChange={onSortChange}
          categories={categories} subCategories={subCategories}
          onExport={onExport}
          resultCount={visibleItems.length}
        />
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed min-w-[980px]">
            <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
              <tr>
                {COLUMN_DEFS.map(c => (
                  <th
                    key={c.key}
                    style={{ width: columnWidths[c.key] }}
                    className="relative text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap select-none"
                  >
                    {c.label}
                    <div
                      onMouseDown={startResize(c.key)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                    />
                  </th>
                ))}
                <th style={{ width: ACTIONS_COL_WIDTH }} className="text-left px-4 py-2.5 text-xs font-semibold text-gray-600 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-gray-400">
                    <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                    Loading items…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-red-500">{error}</td>
                </tr>
              ) : visibleItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-14 text-center text-gray-400">
                    <PackageX size={26} className="mx-auto mb-2 text-gray-300" />
                    No items found. Click "Add New Item" to start.
                  </td>
                </tr>
              ) : paginated.map(item => (
                <RmTableRow
                  key={item.itemCode}
                  item={item}
                  onEdit={onEdit}
                  onDelete={onDelete}
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
