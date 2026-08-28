import { Fragment, useEffect, useMemo, useState } from 'react'
import { Clock } from 'lucide-react'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { STATUS_STYLE, STATUS_LABELS } from '../../shared/constants.js'
import { fmtDate, etdDays } from '../../shared/utils.js'
import { Button, ColumnsMenu } from '../../../../../components/ui'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { useUserDisplayNames } from '../../../../../hooks/masters/useUserDisplayNames.js'
import { useColumnPreferences } from '../../../../../hooks/useColumnPreferences.js'
import SalesHistoryToolbar, { EMPTY_SALES_HISTORY_FILTERS, DEFAULT_SALES_HISTORY_SORT } from './components/SalesHistoryToolbar.jsx'

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  : '—'

const orderQty = (o) => o.items.reduce((n, it) => n + parseFloat(it.totalQty || 0), 0)

// Resizable / toggleable columns — same drag-handle + Columns-menu mechanism
// as the Item / Print Master / Inward History tables. The leading expand-arrow
// column and the trailing Actions column stay fixed width.
const COLUMN_DEFS = [
  { key: 'diNo',      label: 'DI No.',     defaultWidth: 150 },
  { key: 'date',      label: 'Date',       defaultWidth: 110 },
  { key: 'customer',  label: 'Customer',   defaultWidth: 200 },
  { key: 'type',      label: 'Type',       defaultWidth: 110 },
  { key: 'totalQty',  label: 'Total Qty',  defaultWidth: 120 },
  { key: 'etd',       label: 'ETD',        defaultWidth: 160 },
  { key: 'invoice',   label: 'Invoice',    defaultWidth: 120 },
  { key: 'items',     label: 'Items',      defaultWidth: 80  },
  { key: 'salesStaff', label: 'Sales Staff', defaultWidth: 140, defaultVisible: false },
  { key: 'createdBy', label: 'Created By', defaultWidth: 150, defaultVisible: false },
  { key: 'updatedBy', label: 'Updated By', defaultWidth: 150, defaultVisible: false },
]
const EXPAND_COL_WIDTH  = 32
const ACTIONS_COL_WIDTH = 90

function TypeBadge({ type }) {
  const isExport = type === 'EXPORT'
  return (
    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isExport ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
      {type || 'DOMESTIC'}
    </span>
  )
}

function EtdCell({ date }) {
  const days    = etdDays(date)
  const overdue = days !== null && days < 0
  const urgent  = days !== null && days >= 0 && days <= 7
  const cls     = overdue ? 'text-red-500 font-semibold' : urgent ? 'text-orange-500 font-semibold' : 'text-gray-500'
  if (!date) return <span className="text-gray-300">—</span>
  return (
    <span className={`text-xs ${cls}`}>
      {fmtDate(date)}
      {days !== null && (
        <span className="ml-1 opacity-70">
          ({overdue ? `${Math.abs(days)}d overdue` : `${days}d`})
        </span>
      )}
    </span>
  )
}

function exportOrdersCsv(orders, displayName) {
  if (!orders.length) { alert('No orders to export — adjust your filters.'); return }
  const headers = ['DI No.', 'SO Id', 'Order Date', 'Customer', 'Company', 'Type', 'Priority', 'Total Qty', 'UOM', 'ETD', 'Invoice No', 'Sales Staff', 'Items', 'Created By', 'Updated By']
  const rows = orders.map(o => {
    const uom = (o.items[0]?.totalUom || 'KG').toUpperCase()
    return [
      o.diNo || '', o.soId || '', fmtDate(o.orderReceivedDate), o.customerName || '', (o.company || '').toUpperCase(),
      o.orderType || '', o.priority || '', orderQty(o), uom, fmtDate(o.estimatedDispatchDate),
      o.invoiceNo || '', o.salesStaff || '', o.items.length, displayName(o.createdBy), displayName(o.updatedBy),
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
  a.download = `sales_order_history_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function OrderHistory({ orders, loading, onOpenDispatch }) {
  const displayName = useUserDisplayNames()
  const [search,       setSearch]       = useState('')
  const [filters,      setFilters]      = useState(EMPTY_SALES_HISTORY_FILTERS)
  const [sort,         setSort]         = useState(DEFAULT_SALES_HISTORY_SORT)
  const [limit,        setLimit]        = useState(15)
  const [page,         setPage]         = useState(1)
  const [expandedKeys, setExpandedKeys] = useState(new Set())

  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } =
    useColumnPreferences('sales-order-history', COLUMN_DEFS)

  const hasFilters = !!(search || filters.status || filters.company || filters.from_date || filters.to_date)

  // Reset to page 1 whenever the applied search/filter/sort changes, so a
  // narrower result set can't strand the view on a now-empty page.
  useEffect(() => { setPage(1) }, [search, filters, sort])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = orders.filter(o => {
      const matchSearch = !q || o.customerName?.toLowerCase().includes(q) || o.diNo?.toLowerCase().includes(q)
      const matchStatus = !filters.status || o.items.some(it => it.status === filters.status)
      const matchCompany = !filters.company || (o.company || '').toLowerCase() === filters.company
      const d = o.orderReceivedDate ? new Date(o.orderReceivedDate) : null
      const matchFrom = !filters.from_date || (d && d >= new Date(filters.from_date))
      const matchTo = !filters.to_date || (d && d <= new Date(filters.to_date + 'T23:59:59'))
      return matchSearch && matchStatus && matchCompany && matchFrom && matchTo
    })

    const dir = sort.direction === 'asc' ? 1 : -1
    return [...list].sort((a, b) => {
      if (sort.field === 'customer')  return dir * (a.customerName || '').localeCompare(b.customerName || '')
      if (sort.field === 'orderDate') return dir * (new Date(a.orderReceivedDate || 0) - new Date(b.orderReceivedDate || 0))
      if (sort.field === 'totalQty')  return dir * (orderQty(a) - orderQty(b))
      // 'etd' (default) — orders with no ETD always sort last, regardless of direction
      const da = a.estimatedDispatchDate || null
      const db = b.estimatedDispatchDate || null
      if (!da && !db) return 0
      if (!da) return 1
      if (!db) return -1
      return dir * (new Date(da) - new Date(db))
    })
  }, [orders, search, filters, sort])

  const paginated = filtered.slice((page - 1) * limit, page * limit)

  const toggle      = (id) => setExpandedKeys(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const expandAll   = () => setExpandedKeys(new Set(paginated.map(o => o.id)))
  const collapseAll = () => setExpandedKeys(new Set())

  const colSpan = visibleColumns.length + 2 // + expand col + actions col

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <h2 className="text-base font-semibold text-gray-900">Order History</h2>
          {!loading && (
            <span className="text-xs text-gray-400">
              {filtered.length} order{filtered.length !== 1 ? 's' : ''}
              {hasFilters && orders.length !== filtered.length && (
                <span className="text-indigo-500 ml-1">(filtered from {orders.length})</span>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="xs" onClick={expandAll}>Expand all</Button>
          <Button variant="outline-gray" size="xs" onClick={collapseAll}>Collapse all</Button>
        </div>
      </div>

      <SalesHistoryToolbar
        search={search} onSearchChange={setSearch}
        filters={filters} onFiltersChange={setFilters}
        sort={sort} onSortChange={setSort}
        onExport={() => exportOrdersCsv(filtered, displayName)}
        resultCount={filtered.length}
      />

      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>

      {loading ? (
        <p className="text-gray-400 text-center py-14">Loading…</p>
      ) : (
        <>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
              <tr className="text-gray-600 text-xs">
                <th style={{ width: EXPAND_COL_WIDTH }} className="px-3 py-2.5" />
                {visibleColumns.map(c => (
                  <th
                    key={c.key}
                    style={{ width: columnWidths[c.key] }}
                    className={`relative px-3 py-2.5 font-semibold select-none ${c.key === 'totalQty' ? 'text-right' : c.key === 'items' ? 'text-center' : 'text-left'}`}
                  >
                    {c.label}
                    <div
                      onMouseDown={startResize(c.key)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                    />
                  </th>
                ))}
                <th style={{ width: ACTIONS_COL_WIDTH }} className="text-left px-3 py-2.5 font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="text-center py-14 text-gray-400">
                    {hasFilters ? 'No orders match your search or filters.' : 'No orders found.'}
                  </td>
                </tr>
              ) : paginated.map(order => {
                const isOpen   = expandedKeys.has(order.id)
                const totalQty = orderQty(order)
                const uom      = (order.items[0]?.totalUom || 'KG').toUpperCase()

                return (
                  <Fragment key={order.id}>
                    {/* ── Main row — click to expand ── */}
                    <tr
                      onClick={() => toggle(order.id)}
                      className={`border-t border-gray-100 cursor-pointer select-none transition-colors ${
                        isOpen ? 'bg-indigo-50 hover:bg-indigo-100/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-3.5 text-center text-gray-400 text-xs">
                        {isOpen ? '▼' : '▶'}
                      </td>

                      {columnVisibility.diNo && (
                        <td className="px-3 py-3.5 truncate">
                          <span className="font-mono text-xs font-bold text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                            {order.diNo}
                          </span>
                        </td>
                      )}
                      {columnVisibility.date && (
                        <td className="px-3 py-3.5 text-xs text-gray-500 whitespace-nowrap">
                          {fmtDate(order.orderReceivedDate)}
                        </td>
                      )}
                      {columnVisibility.customer && (
                        <td className="px-3 py-3.5 font-semibold text-gray-800 truncate">
                          {toTitleCase(order.customerName)}
                        </td>
                      )}
                      {columnVisibility.type && (
                        <td className="px-3 py-3.5">
                          <TypeBadge type={order.orderType} />
                        </td>
                      )}
                      {columnVisibility.totalQty && (
                        <td className="px-3 py-3.5 text-right font-bold text-gray-700 whitespace-nowrap">
                          {totalQty} <span className="text-xs font-normal text-gray-400">{uom}</span>
                        </td>
                      )}
                      {columnVisibility.etd && (
                        <td className="px-3 py-3.5">
                          <EtdCell date={order.estimatedDispatchDate} />
                        </td>
                      )}
                      {columnVisibility.invoice && (
                        <td className="px-3 py-3.5 text-xs text-gray-400 font-mono truncate">
                          {order.invoiceNo || '—'}
                        </td>
                      )}
                      {columnVisibility.items && (
                        <td className="px-3 py-3.5 text-center">
                          <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {order.items.length}
                          </span>
                        </td>
                      )}
                      {columnVisibility.salesStaff && (
                        <td className="px-3 py-3.5 text-xs text-gray-500 truncate">
                          {order.salesStaff || '—'}
                        </td>
                      )}
                      {columnVisibility.createdBy && (
                        <td className="px-3 py-3.5 text-xs text-gray-500 truncate">
                          {displayName(order.createdBy)}
                        </td>
                      )}
                      {columnVisibility.updatedBy && (
                        <td className="px-3 py-3.5 text-xs text-gray-500 truncate">
                          {displayName(order.updatedBy)}
                        </td>
                      )}

                      <td className="px-3 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                        <Button variant="outline-gray" size="xs" onClick={() => onOpenDispatch(order)}>Edit</Button>
                      </td>
                    </tr>

                    {/* ── Item sub-rows (visible when expanded) ── */}
                    {isOpen && order.items.map((it, idx) => (
                      <tr key={it.id || idx} className="bg-indigo-50/30 border-t border-indigo-100/60">
                        <td colSpan={colSpan} className="px-0 py-0">
                          <div className="flex items-center pl-8 pr-4 py-2 gap-0">
                            <div className="w-px h-8 bg-indigo-300 mr-4 shrink-0" />

                            <div className="flex-1 min-w-0">
                              <span className="text-sm font-semibold text-gray-800">
                                {toTitleCase(it.inhouseProductName || it.customerProductName) || '—'}
                              </span>
                              {it.customerProductName && it.customerProductName !== it.inhouseProductName && (
                                <span className="ml-2 text-[10px] text-gray-400 italic">
                                  ({toTitleCase(it.customerProductName)})
                                </span>
                              )}
                            </div>

                            <span className="text-sm font-bold text-gray-700 w-28 shrink-0">
                              {it.totalQty} <span className="text-xs font-normal text-gray-400">{it.totalUom?.toUpperCase()}</span>
                            </span>

                            <span className="text-xs text-gray-500 w-52 shrink-0">
                              {[it.unitPackType, it.packingType].filter(Boolean).join(' / ') || '—'}
                            </span>

                            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full w-28 text-center shrink-0 ${STATUS_STYLE[it.status] || 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABELS[it.status] || it.status}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* ── Created / Updated footer row (visible when expanded) ── */}
                    {isOpen && (
                      <tr className="bg-indigo-50/30 border-t border-indigo-100/60">
                        <td colSpan={colSpan} className="px-8 py-2">
                          <div className="flex items-center justify-between text-xs text-gray-400">
                            <span className="flex items-center gap-1.5"><Clock size={12} /> Created by {displayName(order.createdBy)} · {fmtDateTime(order.createdAt)}</span>
                            <span className="flex items-center gap-1.5"><Clock size={12} /> Updated by {displayName(order.updatedBy)} · {fmtDateTime(order.updatedAt)}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 pb-3 pt-1">
          <Pagination
            page={page}
            total={filtered.length}
            limit={limit}
            onChange={setPage}
            onLimitChange={l => { setLimit(l); setPage(1) }}
          />
        </div>
        </>
      )}
    </div>
  )
}
