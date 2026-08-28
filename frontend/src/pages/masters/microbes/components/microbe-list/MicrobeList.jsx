import { Pencil, Trash2 } from 'lucide-react'
import { IconButton, ColumnsMenu } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { useColumnPreferences } from '../../../../../hooks/useColumnPreferences.js'
import MicrobeToolbar from './MicrobeToolbar.jsx'

import { toTitleCase } from '../../../../../utils/textDisplay.js'

// Resizable/toggleable columns — same drag-handle + Columns-menu mechanism
// as the User Roles / Pack Records tables. The leading "#" and trailing
// Actions columns stay fixed width.
const COLUMN_DEFS = [
  { key: 'name',       label: 'Microbe Name', defaultWidth: 260 },
  { key: 'code',       label: 'Code',         defaultWidth: 140 },
  { key: 'uom',        label: 'UOM',          defaultWidth: 100 },
  { key: 'dateAdded',  label: 'Date Added',   defaultWidth: 140 },
  { key: 'stock',      label: 'Stock',        defaultWidth: 130 },
]
const INDEX_COL_WIDTH   = 48
const ACTIONS_COL_WIDTH = 110

export default function MicrobeList({
  paginated, total, loading, hasStock, onEdit, onDelete, onPageChange, onLimitChange, page, limit,
  search, onSearch, filters, onFiltersChange, sort, onSortChange, uoms, onExport,
}) {
  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('microbes-master', COLUMN_DEFS)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <MicrobeToolbar
        search={search} onSearchChange={onSearch}
        filters={filters} onFiltersChange={onFiltersChange}
        sort={sort} onSortChange={onSortChange}
        uoms={uoms} onExport={onExport}
        resultCount={total}
      />

      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-10 text-sm">Loading...</p>
      ) : total === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <p className="text-sm font-medium">No microbes found. Add one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
              <tr className="text-gray-600 text-xs">
                <th style={{ width: INDEX_COL_WIDTH }} className="text-left px-4 py-3 font-semibold">#</th>
                {visibleColumns.map(c => (
                  <th
                    key={c.key}
                    style={{ width: columnWidths[c.key] }}
                    className="relative text-left px-4 py-3 font-semibold select-none"
                  >
                    {c.label}
                    <div
                      onMouseDown={startResize(c.key)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                    />
                  </th>
                ))}
                <th style={{ width: ACTIONS_COL_WIDTH }} className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginated.map((m, i) => {
                const inStock = hasStock(m.microbeCode)
                return (
                  <tr key={m.microbeId} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400">{(page - 1) * limit + i + 1}</td>
                    {columnVisibility.name && (
                      <td className="px-4 py-3 font-medium text-gray-900 truncate">{toTitleCase(m.microbeName)}</td>
                    )}
                    {columnVisibility.code && (
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200 px-2 py-0.5 rounded-md">{m.microbeCode}</span>
                      </td>
                    )}
                    {columnVisibility.uom && (
                      <td className="px-4 py-3 text-gray-600 text-xs">{m.uom ? m.uom.toUpperCase() : '—'}</td>
                    )}
                    {columnVisibility.dateAdded && (
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'}
                      </td>
                    )}
                    {columnVisibility.stock && (
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${
                          inStock ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
                        }`}>
                          {inStock ? 'Has stock' : 'No stock'}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Can permission="masters.microbe.update">
                          <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(m)} />
                        </Can>
                        {inStock ? (
                          <span className="text-xs text-gray-400 self-center ml-1">Cannot delete (has stock)</span>
                        ) : (
                          <Can permission="masters.microbe.delete">
                            <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(m.microbeId, m.microbeName)} />
                          </Can>
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
