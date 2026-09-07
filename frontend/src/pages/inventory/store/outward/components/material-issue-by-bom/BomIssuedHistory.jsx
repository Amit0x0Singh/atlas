import { useState, useEffect, useMemo, Fragment } from 'react'
import { outwardApi } from '../../../../../../api/inventory.js'
import { Button } from '../../../../../../components/ui'
import Pagination from '../../../../../../components/pagination/Pagination.jsx'
import { ChevronDown, ChevronRight, Search, Filter, ArrowUpDown } from 'lucide-react'
import BomIssuedFilterModal, { EMPTY_BOM_ISSUED_FILTERS } from './BomIssuedFilterModal.jsx'
import BomIssuedSortModal, { DEFAULT_BOM_ISSUED_SORT } from './BomIssuedSortModal.jsx'

import { toTitleCase } from '../../../../../../utils/textDisplay.js'
import { fmtQty } from '../../../../../../utils/qty.js'
function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

// Outward remarks for BOM issuance are written as:
// "BOM: {productName} | Batch: {batchSize} kg | Ref: {batchRef}"
function parseRemarks(remarks) {
  const m = /^BOM:\s*(.*?)(?:\s*\|\s*Batch:\s*([\d.]+)\s*kg)?(?:\s*\|\s*Ref:\s*(.*))?$/.exec(remarks || '')
  return {
    productName: m?.[1]?.trim() || 'Unknown product',
    batchSize:   m?.[2] || '',
    batchRef:    m?.[3]?.trim() || '',
  }
}

function countActiveFilters(f) {
  return (f.from ? 1 : 0) + (f.to ? 1 : 0)
}

// BOM Issued — the completed history only. Every raw-material line issued
// against a BOM is grouped back into its batch here. In-progress / paused
// sessions live on the Material Issue by BOM screen (resume targets), never
// here.
export default function BomIssuedHistory() {
  const [histRows, setHistRows] = useState([])
  const [loading, setLoading]   = useState(true)
  const [expanded, setExpanded] = useState(null)

  const [search, setSearch]   = useState('')
  const [filters, setFilters] = useState(EMPTY_BOM_ISSUED_FILTERS)
  const [sort, setSort]       = useState(DEFAULT_BOM_ISSUED_SORT)
  const [page, setPage]       = useState(1)
  const [limit, setLimit]     = useState(15)
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort]     = useState(false)

  useEffect(() => {
    setLoading(true)
    outwardApi.history({ limit: 300 })
      .then(res => setHistRows((res.data || []).filter(row => row.sourceType === 'BOM_ISSUANCE')))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Group individual issuance lines back into their BOM batch
  const historyBatches = useMemo(() => {
    const map = new Map()
    for (const row of histRows) {
      const { productName, batchSize, batchRef } = parseRemarks(row.remarks)
      const key = `${productName}__${batchRef}`
      if (!map.has(key)) map.set(key, { key, productName, batchSize, batchRef, lines: [], lastTs: row.timestamp })
      const b = map.get(key)
      b.lines.push(row)
      if (new Date(row.timestamp) > new Date(b.lastTs)) b.lastTs = row.timestamp
    }
    return [...map.values()]
  }, [histRows])

  // Search + filter + sort over the grouped batches.
  const rows = useMemo(() => {
    let list = historyBatches.map(b => ({
      key: `hist-${b.key}`,
      productName: b.productName,
      batchQty: b.batchSize,
      batchRef: b.batchRef,
      itemCount: b.lines.length,
      lastUpdated: b.lastTs,
      lines: b.lines.map(l => ({
        rmName: l.rmName || l.rmCode,
        rmCode: l.sourceId,
        // Rows predating operationalUom have it null — fall back to the item's
        // Inventory UOM (the unit qtyIssued is in) rather than a bare number.
        detail: `${fmtQty(l.operationalQty ?? l.qtyIssued)} ${(l.operationalUom || l.inventoryUom || '').toUpperCase()} · ${fmtDate(l.timestamp)}`,
      })),
    }))

    const q = search.trim().toLowerCase()
    if (q) list = list.filter(r => `${r.productName} ${r.batchRef}`.toLowerCase().includes(q))
    if (filters.from) {
      const from = new Date(filters.from)
      list = list.filter(r => new Date(r.lastUpdated) >= from)
    }
    if (filters.to) {
      const to = new Date(`${filters.to}T23:59:59`)
      list = list.filter(r => new Date(r.lastUpdated) <= to)
    }

    const dir = sort.direction === 'asc' ? 1 : -1
    list.sort((a, b) => {
      if (sort.field === 'product')  return dir * toTitleCase(a.productName).localeCompare(toTitleCase(b.productName))
      if (sort.field === 'batchQty') return dir * ((parseFloat(a.batchQty) || 0) - (parseFloat(b.batchQty) || 0))
      return dir * (new Date(a.lastUpdated) - new Date(b.lastUpdated)) // 'date'
    })
    return list
  }, [historyBatches, search, filters, sort])

  const total = rows.length
  const pageRows = rows.slice((page - 1) * limit, page * limit)
  const activeFilterCount = countActiveFilters(filters)
  const sortIsDefault = sort.field === DEFAULT_BOM_ISSUED_SORT.field && sort.direction === DEFAULT_BOM_ISSUED_SORT.direction

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">BOM Issued</h2>
        <p className="text-sm text-gray-500 mt-0.5">Completed BOM issuance history — grouped by production batch</p>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-hidden bg-white">
        {/* ── Toolbar: search + count + Sort by + Filter ─────────────────── */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search product or batch ref…"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
            {total} {total === 1 ? 'batch' : 'batches'}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant={sortIsDefault ? 'outline-gray' : 'outline'} size="sm" icon={ArrowUpDown} onClick={() => setShowSort(true)}>
              Sort by
            </Button>
            <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
              Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Loading…</p>
        ) : total === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-gray-400">
            {search || activeFilterCount ? 'No BOM issuances match your search / filters' : 'No BOM issuances recorded yet'}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 text-white text-xs">
                  <tr>
                    <th className="px-4 py-2.5 w-8" />
                    <th className="text-left px-4 py-2.5 font-semibold">Status</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Product</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Batch Ref</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Materials</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Last Issued</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map(row => {
                    const isOpen = expanded === row.key
                    return (
                      <Fragment key={row.key}>
                        <tr className="border-t border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(isOpen ? null : row.key)}>
                          <td className="px-4 py-2.5 text-gray-400">
                            {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Issued</span>
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-gray-900">{toTitleCase(row.productName)}</div>
                          </td>
                          <td className="px-4 py-2.5">
                            <span className="font-medium text-gray-700">{row.batchQty} KG</span>
                            {row.batchRef && <div className="text-xs text-gray-400 font-mono">{row.batchRef}</div>}
                          </td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{row.itemCount} item{row.itemCount !== 1 ? 's' : ''} issued</td>
                          <td className="px-4 py-2.5 text-xs text-gray-400 whitespace-nowrap">
                            {row.lastUpdated ? fmtDate(row.lastUpdated) : '—'}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50/60">
                            <td colSpan={6} className="px-4 py-3">
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead className="text-gray-400">
                                    <tr>
                                      <th className="text-left font-medium pb-1">RM</th>
                                      <th className="text-left font-medium pb-1">Code / Source</th>
                                      <th className="text-left font-medium pb-1">Detail</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {row.lines.map((l, i) => (
                                      <tr key={i} className="border-t border-gray-200">
                                        <td className="py-1 text-gray-700">{toTitleCase(l.rmName)}</td>
                                        <td className="py-1 font-mono text-gray-400">{l.rmCode}</td>
                                        <td className="py-1 text-gray-600">{l.detail}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
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
            <div className="px-4 pb-3">
              <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
            </div>
          </>
        )}
      </div>

      <BomIssuedFilterModal
        open={showFilter}
        onClose={() => setShowFilter(false)}
        value={filters}
        onApply={f => { setFilters(f); setPage(1) }}
      />
      <BomIssuedSortModal
        open={showSort}
        onClose={() => setShowSort(false)}
        value={sort}
        onApply={setSort}
      />
    </div>
  )
}
