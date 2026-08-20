import { useMemo } from 'react'
import { Pencil, Trash2, Loader2 } from 'lucide-react'
import { IconButton, ColumnsMenu } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { useColumnPreferences } from '../../../../../hooks/useColumnPreferences.js'
import { Can } from '../../../../../components/common/Can.jsx'
import EquipmentToolbar from './EquipmentToolbar.jsx'

// Resizable columns — same drag-handle mechanism as the other master tables.
// "Actions" stays a fixed width since it only holds icons.
const COLUMN_DEFS = [
  { key: 'equipCode',      label: 'Equip Code',      defaultWidth: 130 },
  { key: 'equipName',      label: 'Equipment Name',  defaultWidth: 220 },
  { key: 'workingVolume',  label: 'Working Volume',  defaultWidth: 140 },
  { key: 'operation',      label: 'Operation',       defaultWidth: 140 },
  { key: 'plant',          label: 'Plant',           defaultWidth: 140 },
]
const ACTIONS_COL_WIDTH = 90

// `items` is already the current page's rows (filtering + pagination happen
// server-side) — `total` is the server-reported match count, used only by
// Pagination to compute page count, not to slice anything here. Sort is
// applied client-side to whatever page is currently loaded.
export default function EquipmentTable({
  items, total, loading, error, page, limit, onEdit, onDelete, onRowClick, onPageChange, onLimitChange,
  search, onSearchChange, filters, onFiltersChange, sort, onSortChange, operationOptions, plantOptions, onExport, exporting,
}) {
  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('equipment-master', COLUMN_DEFS)

  const sortedItems = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...items].sort((a, b) => {
      if (sort.field === 'equipCode') return dir * (a.equipCode || '').localeCompare(b.equipCode || '')
      if (sort.field === 'workingVolume') return dir * ((a.workingVolume || 0) - (b.workingVolume || 0))
      return dir * (a.equipName || '').localeCompare(b.equipName || '') // 'name'
    })
  }, [items, sort])

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <EquipmentToolbar
        search={search} onSearchChange={onSearchChange}
        filters={filters} onFiltersChange={onFiltersChange}
        sort={sort} onSortChange={onSortChange}
        operationOptions={operationOptions} plantOptions={plantOptions}
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
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-14 text-center text-gray-400">
                  <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                  Loading equipment…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="py-14 text-center text-red-500">{error}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="text-center py-10 text-gray-400">
                  No equipment found.
                </td>
              </tr>
            ) : sortedItems.map(item => (
              <tr key={item.equipId} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(item)}>
                {columnVisibility.equipCode && <td className="px-4 py-3 font-mono text-gray-500 truncate">{item.equipCode}</td>}
                {columnVisibility.equipName && <td className="px-4 py-3 font-medium truncate">{toTitleCase(item.equipName)}</td>}
                {columnVisibility.workingVolume && <td className="px-4 py-3 text-gray-500 truncate">{item.workingVolume ?? 0}{item.workingUnit ? ` ${item.workingUnit.toUpperCase()}` : ''}</td>}
                {columnVisibility.operation && <td className="px-4 py-3 text-gray-500 truncate">{item.operation || '—'}</td>}
                {columnVisibility.plant && <td className="px-4 py-3 text-gray-500 truncate">{item.plant || '—'}</td>}
                <td className="px-4 py-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <Can permission="masters.equipment.update">
                    <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                  </Can>
                  <Can permission="masters.equipment.delete">
                    <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.equipId, item.equipName)} />
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
