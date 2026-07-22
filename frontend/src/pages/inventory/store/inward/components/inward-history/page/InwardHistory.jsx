import { useState, useEffect, useMemo } from 'react'
import { packsApi, inwardApi } from '../../../../../../../api/inventory.js'
import Pagination from '../../../../../../../components/pagination/Pagination.jsx'
import { Button } from '../../../../../../../components/ui'
import { groupPacks } from '../utils/groupPacks.js'
import HistoryFilters from '../components/HistoryFilters.jsx'
import HistoryRow from '../components/HistoryRow.jsx'
import './InwardHistory.css'

export default function InwardHistory() {
  const [packs, setPacks]           = useState([])
  const [loading, setLoading]       = useState(false)
  const [expandedKeys, setExpandedKeys] = useState(new Set())

  // Filters
  const [searchText, setSearchText]       = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [dateFrom, setDateFrom]           = useState('')
  const [dateTo, setDateTo]               = useState('')
  const [page, setPage]                   = useState(1)
  const [limit, setLimit]                 = useState(15)

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

  // Apply filters
  const filteredGroups = useMemo(() => {
    return allGroups.filter(g => {
      if (searchText) {
        const q = searchText.toLowerCase()
        if (
          !g.itemName?.toLowerCase().includes(q) &&
          !g.itemCode?.toLowerCase().includes(q) &&
          !g.lotNo?.toLowerCase().includes(q) &&
          !g.invoiceNo?.toLowerCase().includes(q)
        ) return false
      }
      if (supplierFilter && g.supplier !== supplierFilter) return false
      if (dateFrom && g.receivedDate && new Date(g.receivedDate) < new Date(dateFrom)) return false
      if (dateTo  && g.receivedDate && new Date(g.receivedDate) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [allGroups, searchText, supplierFilter, dateFrom, dateTo])

  const toggle      = (key) => setExpandedKeys(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const expandAll   = () => setExpandedKeys(new Set(filteredGroups.map(g => g.key)))
  const collapseAll = () => setExpandedKeys(new Set())

  const hasFilters = searchText || supplierFilter || dateFrom || dateTo
  const clearFilters = () => { setSearchText(''); setSupplierFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }

  useEffect(() => { setPage(1) }, [searchText, supplierFilter, dateFrom, dateTo])

  const totalBags = filteredGroups.reduce((s, g) => s + g.bags.length, 0)
  const paginatedGroups = filteredGroups.slice((page - 1) * limit, page * limit)

  return (
    <div className="p-6">
      <HistoryFilters
        searchText={searchText} setSearchText={setSearchText}
        supplierFilter={supplierFilter} setSupplierFilter={setSupplierFilter} suppliers={suppliers}
        dateFrom={dateFrom} setDateFrom={setDateFrom} dateTo={dateTo} setDateTo={setDateTo}
        hasFilters={hasFilters} onClear={clearFilters} onRefresh={load}
      />

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

        {loading ? (
          <p className="text-gray-400 text-center py-14">Loading inward history?</p>
        ) : (
          <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white text-xs">
                <tr>
                  <th className="w-8 px-3 py-2.5" />
                  <th className="text-left px-3 py-2.5 font-semibold">Item</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Lot / Invoice</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Supplier</th>
                  <th className="text-center px-3 py-2.5 font-semibold">Bags</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Total Qty</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Received</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Warehouse(s)</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Print All QRs</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-14 text-gray-400">
                      {hasFilters ? 'No records match your filters.' : 'No inward records found.'}
                    </td>
                  </tr>
                ) : (
                  paginatedGroups.map(g => (
                    <HistoryRow key={g.key} group={g} isOpen={expandedKeys.has(g.key)} onToggle={() => toggle(g.key)} />
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
