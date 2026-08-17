import { useMemo, useState } from 'react'
import './LedgerTable.css'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'
import LedgerToolbar from '../ledger-filters/LedgerToolbar.jsx'

const TX_COLORS = {
  INWARD:            'bg-green-100 text-green-800',
  BOM_ISSUANCE:      'bg-blue-100 text-blue-800',
  PACK_TO_CONTAINER: 'bg-purple-100 text-purple-800',
  STOCK_RECON:       'bg-orange-100 text-orange-800',
}

// Resizable columns — same drag-handle mechanism as the Item/Product/
// Equipment Master tables. "Detail" stays a fixed width since it only holds
// a magnifier icon.
const COLUMN_DEFS = [
  { key: 'timestamp',       label: 'Date & Time',       defaultWidth: 150 },
  { key: 'itemName',        label: 'Item Name',         defaultWidth: 220 },
  { key: 'transactionType', label: 'Transaction',       defaultWidth: 160 },
  { key: 'qty',             label: 'Qty',                defaultWidth: 150, align: 'right' },
  { key: 'reference',       label: 'Reference',         defaultWidth: 200 },
]
const DETAIL_COL_WIDTH = 70
const MIN_COL_WIDTH = 60

export default function LedgerTable({
  loading, rows, onOpenDetail,
  search, onSearchChange, filters, onFiltersChange, sort, onSortChange, onExport, exporting, resultCount,
}) {
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

  // `rows` is only the current page — the backend hardcodes
  // `orderBy: { timestamp: 'desc' }` with no dynamic sort param, so this only
  // re-sorts whichever page is already loaded, same compromise Product/
  // Equipment Master use for their client-side sort.
  const sortedRows = useMemo(() => {
    const dir = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sort.field === 'itemName') return dir * (toTitleCase(a.itemName) || a.itemCode || '').localeCompare(toTitleCase(b.itemName) || b.itemCode || '')
      if (sort.field === 'qty') return dir * ((a.inQty || a.outQty || 0) - (b.inQty || b.outQty || 0))
      return dir * (new Date(a.timestamp) - new Date(b.timestamp)) // 'timestamp'
    })
  }, [rows, sort])

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <LedgerToolbar
        search={search} onSearchChange={onSearchChange}
        filters={filters} onFiltersChange={onFiltersChange}
        sort={sort} onSortChange={onSortChange}
        onExport={onExport} exporting={exporting}
        resultCount={resultCount}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
            <tr className="text-gray-600 text-xs">
              {COLUMN_DEFS.map(c => (
                <th
                  key={c.key}
                  style={{ width: columnWidths[c.key] }}
                  className={`relative px-4 py-3 font-semibold select-none ${c.align === 'right' ? 'text-right' : 'text-left'}`}
                >
                  {c.label}
                  <div
                    onMouseDown={startResize(c.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                  />
                </th>
              ))}
              <th style={{ width: DETAIL_COL_WIDTH }} className="px-4 py-3 text-center font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : sortedRows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions found</td></tr>
            ) : sortedRows.map(row => {
              const isIn  = row.inQty  > 0
              const isOut = row.outQty > 0
              const invQty = isIn ? row.inQty : row.outQty
              // BOM issuance rows carry the item's Operational UOM qty
              // alongside the Inventory UOM deduction (outQty) — shown as
              // the primary figure with the inventory-uom amount as a
              // "(X deducted)" note underneath, same convention Store
              // Outward's Recent Transactions table uses, so the two views
              // read as one consistent number instead of two disagreeing ones.
              const showOperational = row.operationalUom && Number(row.operationalQty) !== Number(invQty)
              const sign = isIn ? '+' : isOut ? '−' : ''
              const color = isIn ? 'text-green-600' : isOut ? 'text-red-600' : 'text-gray-400'
              const qty = !isIn && !isOut
                ? <span className="text-gray-400">—</span>
                : (
                  <span className={`font-semibold ${color}`}>
                    {showOperational
                      ? <>{sign}{Number(row.operationalQty).toFixed(3)} {row.operationalUom?.toUpperCase()}</>
                      : <>{sign}{Number(invQty).toFixed(3)} {(row.uom || '').toUpperCase()}</>}
                    {showOperational && (
                      <div className="text-[10px] font-normal text-gray-400">
                        ({Number(invQty).toFixed(3)} {(row.uom || '').toUpperCase()} deducted)
                      </div>
                    )}
                  </span>
                )
              return (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer"
                  onClick={() => onOpenDetail(row)}>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap overflow-hidden">
                    {new Date(row.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-800 truncate">{toTitleCase(row.itemName) || row.itemCode}</td>
                  <td className="px-4 py-2.5 overflow-hidden">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TX_COLORS[row.transactionType] || 'bg-gray-100 text-gray-600'}`}>
                      {row.transactionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right overflow-hidden">{qty}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs truncate">{row.reference || '—'}</td>
                  <td className="px-4 py-2.5 text-center text-blue-400 hover:text-blue-600">🔍</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
