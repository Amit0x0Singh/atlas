import './RmTable.css'
import { useNavigate } from 'react-router-dom'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { Button, ColumnsMenu } from '../../../../../components/ui'
import { ChevronRight } from 'lucide-react'
import RmToolbar from './RmToolbar.jsx'
import { useColumnPreferences } from '../../../../../hooks/useColumnPreferences.js'

import { toTitleCase } from '../../../../../utils/textDisplay.js'

// Resizable columns — same drag-handle mechanism as UsersTable.jsx. "Details"
// stays a fixed width since it only ever holds one button.
const COLUMN_DEFS = [
  { key: 'idx',       label: '#',             align: 'left',   defaultWidth: 56  },
  { key: 'name',      label: 'Raw Material',  align: 'left',   defaultWidth: 280 },
  { key: 'uom',       label: 'UOM',           align: 'center', defaultWidth: 100 },
  { key: 'inPack',    label: 'In Pack',       align: 'right',  defaultWidth: 140 },
  { key: 'inContainer', label: 'In Container', align: 'right', defaultWidth: 140 },
  { key: 'totalQty',  label: 'Total Qty',     align: 'right',  defaultWidth: 160 },
]
const DETAILS_COL_WIDTH = 150
// Tailwind's JIT scans for literal class strings, so `text-${align}` would
// never match — needs a lookup instead.
const ALIGN_CLASS = { left: 'text-left', center: 'text-center', right: 'text-right' }
function fmt(n, dec = 3) {
  if (n == null) return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  if (v === 0) return '0'
  return v % 1 === 0
    ? v.toLocaleString('en-IN')
    : v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: dec })
}

function StockBadge({ value }) {
  const v = Number(value) || 0
  if (v <= 0) return <span className="text-red-500 font-semibold">0</span>
  return <span className="text-gray-900 font-semibold">{fmt(v)}</span>
}

function SkeletonRow() {
  return (
    <tr className="border-t border-gray-100 animate-pulse">
      {[...Array(7)].map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </td>
      ))}
    </tr>
  )
}

export default function RmTable({
  loading, items, filtered, paginated, page, limit, onPageChange, onLimitChange,
  search, onSearchChange, filters, onFiltersChange, sort, onSortChange, uomOptions, onExport,
}) {
  const navigate = useNavigate()

  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('rm-material-stock', COLUMN_DEFS)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-900">Raw Material Register</span>
        {!loading && (
          <span className="text-xs text-gray-400">
            {filtered.length} of {items.length} items
          </span>
        )}
      </div>

      <RmToolbar
        search={search} onSearchChange={onSearchChange}
        filters={filters} onFiltersChange={onFiltersChange}
        sort={sort} onSortChange={onSortChange}
        uomOptions={uomOptions} onExport={onExport}
        resultCount={filtered.length}
      />

      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead>
            <tr className="text-gray-600 text-xs" style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
              {visibleColumns.map(c => (
                <th
                  key={c.key}
                  style={{ width: columnWidths[c.key] }}
                  className={`relative px-4 py-3 font-semibold select-none ${ALIGN_CLASS[c.align]}`}
                >
                  {c.label}
                  <div
                    onMouseDown={startResize(c.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                  />
                </th>
              ))}
              <th style={{ width: DETAILS_COL_WIDTH }} className="text-center px-4 py-3 font-semibold">Details</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + 1} className="text-center py-14 text-gray-400">No raw materials found.</td>
              </tr>
            ) : (
              paginated.map((it, idx) => {
                const hasStock = it.totalStock > 0
                return (
                  <tr key={it.itemCode} className="border-t border-gray-100 hover:bg-gray-50 transition-colors group">
                    {columnVisibility.idx && <td style={{ width: columnWidths.idx }} className="px-4 py-3 text-xs text-gray-400 tabular-nums overflow-hidden">{idx + 1}</td>}
                    {columnVisibility.name && (
                      <td style={{ width: columnWidths.name }} className="px-4 py-3 overflow-hidden">
                        <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors truncate">{toTitleCase(it.itemName)}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5 truncate">{it.itemCode}</div>
                      </td>
                    )}
                    {columnVisibility.uom && (
                      <td style={{ width: columnWidths.uom }} className="px-4 py-3 text-center overflow-hidden">
                        <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-md">{it.uom ? it.uom.toUpperCase() : '—'}</span>
                      </td>
                    )}
                    {columnVisibility.inPack && (
                      <td style={{ width: columnWidths.inPack }} className="px-4 py-3 text-right tabular-nums overflow-hidden">
                        <div><StockBadge value={it.stockInPacks} /></div>
                        {it.activePacks > 0 && (
                          <div className="text-xs text-gray-400 mt-0.5">{it.activePacks} bag{it.activePacks !== 1 ? 's' : ''}</div>
                        )}
                      </td>
                    )}
                    {columnVisibility.inContainer && (
                      <td style={{ width: columnWidths.inContainer }} className="px-4 py-3 text-right tabular-nums overflow-hidden">
                        <StockBadge value={it.stockInContainer} />
                      </td>
                    )}
                    {columnVisibility.totalQty && (
                      <td style={{ width: columnWidths.totalQty }} className="px-4 py-3 text-right tabular-nums overflow-hidden">
                        <div className={`text-base font-bold tabular-nums ${hasStock ? 'text-gray-900' : 'text-red-400'}`}>
                          {fmt(it.totalStock)}{it.uom && <span className="text-xs font-medium text-gray-400 ml-1">{it.uom.toUpperCase()}</span>}
                        </div>
                        {!hasStock && <div className="text-[10px] text-red-400 font-medium">OUT OF STOCK</div>}
                      </td>
                    )}
                    <td style={{ width: DETAILS_COL_WIDTH }} className="px-4 py-3 text-center">
                      <Button
                        variant="primary"
                        size="xs"
                        icon={ChevronRight}
                        iconPosition="right"
                        onClick={() => navigate(`/rm-material/${encodeURIComponent(it.itemCode)}`)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <div className="px-5 pb-3">
        <Pagination page={page} total={filtered.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
