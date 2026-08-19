import { useState, useEffect, useMemo } from 'react'
import { packsApi, inwardApi } from '../../../../../../../api/inventory.js'
import Pagination from '../../../../../../../components/pagination/Pagination.jsx'
import { Button, ColumnsMenu } from '../../../../../../../components/ui'
import { groupPacks } from '../utils/groupPacks.js'
import HistoryRow from '../components/HistoryRow.jsx'
import InwardHistoryToolbar, { EMPTY_INWARD_HISTORY_FILTERS, DEFAULT_INWARD_HISTORY_SORT } from '../components/InwardHistoryToolbar.jsx'
import { useColumnPreferences } from '../../../../../../../hooks/useColumnPreferences.js'
import './InwardHistory.css'

// Resizable columns — same drag-handle mechanism as the Item/Product/
// Equipment Master tables. The leading expand-arrow column and the trailing
// "Print All QRs" column stay fixed width; HistoryRow.jsx needs no changes —
// it inherits column widths from the header row under table-layout:fixed.
const COLUMN_DEFS = [
  { key: 'item',        label: 'Item',           defaultWidth: 220 },
  { key: 'lotInvoice',  label: 'Lot / Invoice',  defaultWidth: 160 },
  { key: 'supplier',    label: 'Supplier',       defaultWidth: 140 },
  { key: 'bags',        label: 'Bags',           defaultWidth: 80  },
  { key: 'totalQty',    label: 'Total Qty',      defaultWidth: 120 },
  { key: 'received',    label: 'Received',       defaultWidth: 120 },
  { key: 'warehouse',   label: 'Warehouse(s)',   defaultWidth: 140 },
]
const EXPAND_COL_WIDTH = 32
const PRINT_COL_WIDTH  = 150

export default function InwardHistory() {
  const [packs, setPacks]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [expandedKeys, setExpandedKeys] = useState(new Set())

  // Filters
  const [searchText, setSearchText] = useState('')
  const [filters, setFilters]       = useState(EMPTY_INWARD_HISTORY_FILTERS)
  const [sort, setSort]             = useState(DEFAULT_INWARD_HISTORY_SORT)
  const [page, setPage]             = useState(1)
  const [limit, setLimit]           = useState(15)

  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('store-inward-history', COLUMN_DEFS)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const [packsRes, inwardRes] = await Promise.all([
        packsApi.list({ limit: 1000 }),
        inwardApi.history({ limit: 10000 }),
      ])
      // Build packId → warehouse map from inward records
      const warehouseMap = {}
      for (const r of (inwardRes.data || [])) {
        warehouseMap[r.packId] = r.warehouse
      }
      const rawPacks = (packsRes.data || []).filter(p => p.status !== 'AWAITING_INWARD')
      setPacks(rawPacks.map(p => ({ ...p, warehouse: warehouseMap[p.packId] || '' })))
    } catch { /* silent */ }
    finally { setLoading(false) }
  }

  const allGroups = useMemo(() => groupPacks(packs), [packs])

  // Unique suppliers for dropdown
  const suppliers = useMemo(() =>
    Array.from(new Set(allGroups.map(g => g.supplier).filter(Boolean))).sort()
  , [allGroups])

  // Apply filters + sort
  const filteredGroups = useMemo(() => {
    let list = allGroups.filter(g => {
      if (searchText) {
        const q = searchText.toLowerCase()
        if (
          !g.itemName?.toLowerCase().includes(q) &&
          !g.itemCode?.toLowerCase().includes(q) &&
          !g.lotNo?.toLowerCase().includes(q) &&
          !g.invoiceNo?.toLowerCase().includes(q)
        ) return false
      }
      if (filters.supplier && g.supplier !== filters.supplier) return false
      if (filters.dateFrom && g.receivedDate && new Date(g.receivedDate) < new Date(filters.dateFrom)) return false
      if (filters.dateTo  && g.receivedDate && new Date(g.receivedDate) > new Date(filters.dateTo + 'T23:59:59')) return false
      return true
    })

    const dir = sort.direction === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sort.field === 'itemName') return dir * (a.itemName || '').localeCompare(b.itemName || '')
      if (sort.field === 'supplier') return dir * (a.supplier || '').localeCompare(b.supplier || '')
      return dir * (new Date(a.receivedDate || 0) - new Date(b.receivedDate || 0)) // 'receivedDate'
    })

    return list
  }, [allGroups, searchText, filters, sort])

  const toggle      = (key) => setExpandedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const expandAll   = () => setExpandedKeys(new Set(filteredGroups.map(g => g.key)))
  const collapseAll = () => setExpandedKeys(new Set())

  const hasFilters = searchText || filters.supplier || filters.dateFrom || filters.dateTo

  useEffect(() => { setPage(1) }, [searchText, filters, sort])

  const totalBags = filteredGroups.reduce((s, g) => s + g.bags.length, 0)
  const paginatedGroups = filteredGroups.slice((page - 1) * limit, page * limit)

  function exportInwardHistoryCsv() {
    if (!filteredGroups.length) { alert('No records to export — adjust your filters.'); return }
    const headers = ['Item Name', 'Item Code', 'Lot No', 'Invoice No', 'Supplier', 'Bags', 'Received Date', 'Warehouse(s)']
    const rows = filteredGroups.map(g => {
      const warehouses = [...new Set(g.bags.map(b => b.warehouse).filter(Boolean))]
      return [
        g.itemName || '', g.itemCode || '', g.lotNo || '', g.invoiceNo || '', g.supplier || '',
        g.bags.length, g.receivedDate ? new Date(g.receivedDate).toLocaleDateString('en-IN') : '',
        warehouses.join('; '),
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')
    })
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `inward_history_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="p-6">
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Table toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-semibold text-gray-900">Inward History</h2>
            {!loading && (
              <span className="text-xs text-gray-400">
                {filteredGroups.length} invoices · {totalBags} bags
                {hasFilters && allGroups.length !== filteredGroups.length && (
                  <span className="text-indigo-500 ml-1">(filtered from {allGroups.length})</span>
                )}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="xs" onClick={expandAll}>Expand all</Button>
            <Button variant="outline-gray" size="xs" onClick={collapseAll}>Collapse all</Button>
          </div>
        </div>

        <InwardHistoryToolbar
          search={searchText} onSearchChange={setSearchText}
          filters={filters} onFiltersChange={setFilters}
          sort={sort} onSortChange={setSort}
          suppliers={suppliers}
          onExport={exportInwardHistoryCsv}
          resultCount={filteredGroups.length}
        />

        <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
          <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
        </div>

        {loading ? (
          <p className="text-gray-400 text-center py-14">Loading inward history?</p>
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
                      className="relative text-left px-3 py-2.5 font-semibold select-none"
                    >
                      {c.label}
                      <div
                        onMouseDown={startResize(c.key)}
                        className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                      />
                    </th>
                  ))}
                  <th style={{ width: PRINT_COL_WIDTH }} className="text-left px-3 py-2.5 font-semibold">Print All QRs</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 2} className="text-center py-14 text-gray-400">
                      {hasFilters ? 'No records match your filters.' : 'No inward records found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map(g => (
                    <HistoryRow key={g.key} group={g} isOpen={expandedKeys.has(g.key)} onToggle={() => toggle(g.key)} columnVisibility={columnVisibility} colSpan={visibleColumns.length + 2} />
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-3">
            <Pagination page={page} total={filteredGroups.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
          </div>
          </>
        )}
      </div>
    </div>
  )
}
