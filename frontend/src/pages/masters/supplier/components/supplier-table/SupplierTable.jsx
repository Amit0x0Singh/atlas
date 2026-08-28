import { Pencil, Trash2 } from 'lucide-react'
import { IconButton, ColumnsMenu } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { useColumnPreferences } from '../../../../../hooks/useColumnPreferences.js'
import SupplierToolbar from './SupplierToolbar.jsx'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

// Resizable/toggleable columns — same drag-handle + Columns-menu mechanism
// as the User Roles / Microbes / Pack Records tables. Actions stays fixed.
const COLUMN_DEFS = [
  { key: 'name',    label: 'Supplier Name', defaultWidth: 220 },
  { key: 'phone',   label: 'Phone',         defaultWidth: 140 },
  { key: 'email',   label: 'Email',         defaultWidth: 200 },
  { key: 'gstin',   label: 'GSTIN',         defaultWidth: 160 },
  { key: 'address', label: 'Address',       defaultWidth: 220 },
]
const ACTIONS_COL_WIDTH = 90

// `items` is already the current (client-side filtered/sorted) page's rows
// — `total` is the filtered match count, `search`/`filters`/`sort` drive the
// standard toolbar (see SupplierToolbar.jsx).
export default function SupplierTable({
  items, total, page, limit, onEdit, onDeactivate, onPageChange, onLimitChange,
  search, onSearchChange, filters, onFiltersChange, sort, onSortChange, onExport,
}) {
  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('supplier-master', COLUMN_DEFS)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <SupplierToolbar
        search={search} onSearchChange={onSearchChange}
        filters={filters} onFiltersChange={onFiltersChange}
        sort={sort} onSortChange={onSortChange}
        onExport={onExport}
        resultCount={total}
      />

      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
            <tr className="text-gray-600 text-xs">
              {visibleColumns.map(c => (
                <th
                  key={c.key}
                  style={{ width: columnWidths[c.key] }}
                  className="relative text-left px-4 py-3 font-semibold select-none whitespace-nowrap"
                >
                  {c.label}
                  <div
                    onMouseDown={startResize(c.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                  />
                </th>
              ))}
              <th style={{ width: ACTIONS_COL_WIDTH }} className="text-left px-4 py-3 font-semibold whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="text-center py-10 text-gray-400">
                  No suppliers found.
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.supplierId} className="border-b border-gray-100 hover:bg-gray-50">
                {columnVisibility.name && (
                  <td className="px-4 py-3 font-medium whitespace-nowrap truncate">{toTitleCase(item.supplierName)}</td>
                )}
                {columnVisibility.phone && (
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.phone || '—'}</td>
                )}
                {columnVisibility.email && (
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap truncate">{item.email || '—'}</td>
                )}
                {columnVisibility.gstin && (
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.gstin || '—'}</td>
                )}
                {columnVisibility.address && (
                  <td className="px-4 py-3 text-gray-500 truncate">{item.address || '—'}</td>
                )}
                <td className="px-4 py-3 flex gap-1">
                  <Can permission="masters.erp-supplier.update">
                    <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                  </Can>
                  <Can permission="masters.erp-supplier.update">
                    <IconButton icon={Trash2} variant="danger" tooltip="Deactivate" onClick={() => onDeactivate(item.supplierId, item.supplierName)} />
                  </Can>
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
