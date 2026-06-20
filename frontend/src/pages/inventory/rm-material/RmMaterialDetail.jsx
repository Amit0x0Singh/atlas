import { useState, useEffect, useMemo } from 'react'
import Pagination from '../../../components/erp/Pagination.jsx'
import { useParams, useNavigate } from 'react-router-dom'
import { stockApi } from '../../../api/inventory.js'
import BackButton from '../../../components/erp/BackButton.jsx'

// ── helpers ───────────────────────────────────────────────────────────────────
function fmtQty(n) {
  if (n == null) return '—'
  const v = Number(n)
  if (isNaN(v)) return '—'
  return v % 1 === 0
    ? v.toLocaleString('en-IN')
    : v.toLocaleString('en-IN', { maximumFractionDigits: 3 })
}

function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUS_META = {
  INWARDED:         { label: 'Inwarded',         cls: 'bg-blue-100 text-blue-800'   },
  PARTIALLY_ISSUED: { label: 'Partial',           cls: 'bg-orange-100 text-orange-700'},
  EXHAUSTED:        { label: 'Exhausted',         cls: 'bg-gray-100 text-gray-500'  },
  AWAITING_INWARD:  { label: 'Awaiting Inward',   cls: 'bg-yellow-100 text-yellow-800'},
}
const statusMeta = (s) => STATUS_META[s] ?? { label: s, cls: 'bg-gray-100 text-gray-600' }

// ── Grouping ──────────────────────────────────────────────────────────────────
function groupPacks(packs) {
  const map = new Map()
  for (const p of packs) {
    const key = `${p.lotNo || 'NOLOT'}||${p.invoiceNo || 'NOINV'}`
    if (!map.has(key)) {
      map.set(key, {
        key,
        lotNo:        p.lotNo,
        invoiceNo:    p.invoiceNo,
        supplier:     p.supplier,
        receivedDate: p.receivedDate,
        uom:          p.uom,
        bags:         [],
      })
    }
    map.get(key).bags.push(p)
  }
  for (const g of map.values()) {
    g.bags.sort((a, b) => (a.bagNo || 0) - (b.bagNo || 0))
  }
  return Array.from(map.values()).sort((a, b) => {
    if (!a.receivedDate && !b.receivedDate) return 0
    if (!a.receivedDate) return 1
    if (!b.receivedDate) return -1
    return new Date(b.receivedDate) - new Date(a.receivedDate)
  })
}

function groupStatus(bags) {
  const s = new Set(bags.map(b => b.status))
  if (s.size === 1) return [...s][0]
  if (bags.some(b => b.status === 'PARTIALLY_ISSUED')) return 'PARTIALLY_ISSUED'
  if (bags.some(b => b.status === 'INWARDED'))         return 'INWARDED'
  return 'EXHAUSTED'
}

// ── Usage progress bar ────────────────────────────────────────────────────────
function UsageBar({ pack }) {
  const total     = Number(pack.packQty)      || 0
  const remaining = Number(pack.remainingQty) ?? total
  const used      = Math.max(0, total - remaining)
  const pct       = total > 0 ? Math.min(100, (used / total) * 100) : 0

  const barColor =
    pct >= 100 ? 'bg-gray-400' :
    pct >= 70  ? 'bg-amber-400' :
                 'bg-emerald-500'

  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden min-w-16">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap tabular-nums flex-shrink-0">
        {fmtQty(remaining)} left
      </span>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function RmMaterialDetail() {
  const { itemCode } = useParams()
  const navigate     = useNavigate()

  const [rm,       setRm]       = useState(null)
  const [packs,    setPacks]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')

  // Filters
  const [search,         setSearch]         = useState('')
  const [supplierFilter, setSupplierFilter] = useState('')
  const [statusFilter,   setStatusFilter]   = useState('')
  const [dateFrom,       setDateFrom]       = useState('')
  const [dateTo,         setDateTo]         = useState('')

  // Expanded groups
  const [expanded, setExpanded] = useState(new Set())

  useEffect(() => { load() }, [itemCode])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await stockApi.rmHistory(itemCode)
      setRm(r.data.rm)
      setPacks(r.data.packs || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const allGroups = useMemo(() => groupPacks(packs), [packs])

  const suppliers = useMemo(() =>
    Array.from(new Set(allGroups.map(g => g.supplier).filter(Boolean))).sort()
  , [allGroups])

  const filteredGroups = useMemo(() => {
    return allGroups.filter(g => {
      if (search) {
        const q = search.toLowerCase()
        if (!g.lotNo?.toLowerCase().includes(q) && !g.invoiceNo?.toLowerCase().includes(q) &&
            !g.supplier?.toLowerCase().includes(q)) return false
      }
      if (supplierFilter && g.supplier !== supplierFilter) return false
      if (statusFilter) {
        const gs = groupStatus(g.bags)
        if (gs !== statusFilter) return false
      }
      if (dateFrom && g.receivedDate && new Date(g.receivedDate) < new Date(dateFrom)) return false
      if (dateTo   && g.receivedDate && new Date(g.receivedDate) > new Date(dateTo + 'T23:59:59')) return false
      return true
    })
  }, [allGroups, search, supplierFilter, statusFilter, dateFrom, dateTo])

  const toggle      = (key) => setExpanded(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  const expandAll   = () => setExpanded(new Set(filteredGroups.map(g => g.key)))
  const collapseAll = () => setExpanded(new Set())

  const hasFilters  = search || supplierFilter || statusFilter || dateFrom || dateTo
  const clearAll    = () => { setSearch(''); setSupplierFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(1) }
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const paginatedGroups = filteredGroups.slice((page - 1) * limit, page * limit)
  useEffect(() => { setPage(1) }, [search, supplierFilter, statusFilter, dateFrom, dateTo])

  const totalBags = filteredGroups.reduce((s, g) => s + g.bags.length, 0)

  // Summary stats for the rm
  const totalQtyReceived = packs.reduce((s, p) => s + (Number(p.packQty) || 0), 0)
  const totalRemaining   = packs.reduce((s, p) => s + (p.remainingQty != null ? Number(p.remainingQty) : 0), 0)
  const totalUsed        = totalQtyReceived - totalRemaining

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-7">

        {/* Header */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <button onClick={() => navigate('/rm-material')}
              className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 mb-2 transition-colors">
              ← Raw Materials
            </button>
            {loading ? (
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            ) : (
              <>
                <h1 className="text-xl font-bold text-gray-900">{rm?.itemName ?? itemCode}</h1>
                <p className="text-xs text-gray-400 mt-0.5">
                  {rm?.itemCode} · {rm?.uom} · Complete inward history
                </p>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition text-lg"
              title="Refresh">↻</button>
            <BackButton />
          </div>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        {/* Quick usage summary */}
        {!loading && packs.length > 0 && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Total Received</div>
              <div className="text-2xl font-bold text-gray-900">{fmtQty(totalQtyReceived)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{rm?.uom} · {packs.length} bags</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Currently Available</div>
              <div className="text-2xl font-bold text-emerald-600">{fmtQty(totalRemaining)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{rm?.uom} remaining</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Total Consumed</div>
              <div className="text-2xl font-bold text-gray-700">{fmtQty(totalUsed)}</div>
              <div className="text-xs text-gray-400 mt-0.5">{rm?.uom} used</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-2">Overall Usage</div>
              <div className="text-2xl font-bold text-gray-900">
                {totalQtyReceived > 0 ? Math.round((totalUsed / totalQtyReceived) * 100) : 0}%
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-gray-700 rounded-full transition-all"
                  style={{ width: `${totalQtyReceived > 0 ? Math.min(100, (totalUsed / totalQtyReceived) * 100) : 0}%` }} />
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search lot, invoice, supplier…"
              className="flex-1 min-w-48 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900"
            />
            <select value={supplierFilter} onChange={e => setSupplierFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 min-w-36 bg-white">
              <option value="">All Suppliers</option>
              {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900 min-w-36 bg-white">
              <option value="">All Statuses</option>
              <option value="INWARDED">Inwarded</option>
              <option value="PARTIALLY_ISSUED">Partially Used</option>
              <option value="EXHAUSTED">Exhausted</option>
              <option value="AWAITING_INWARD">Awaiting Inward</option>
            </select>
            <div className="flex items-center gap-1.5">
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
              <span className="text-gray-400 text-xs">to</span>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900" />
            </div>
            {hasFilters && (
              <button onClick={clearAll}
                className="text-sm text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50">
                × Clear
              </button>
            )}
            <button onClick={load}
              className="text-sm border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50">
              ↻ Refresh
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-gray-900">Inward History</h2>
              {!loading && (
                <span className="text-xs text-gray-400">
                  {filteredGroups.length} lot{filteredGroups.length !== 1 ? 's' : ''} · {totalBags} bags
                  {hasFilters && allGroups.length !== filteredGroups.length && (
                    <span className="text-indigo-500 ml-1">(filtered from {allGroups.length})</span>
                  )}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={expandAll}
                className="text-xs text-blue-600 px-2.5 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50">
                Expand all
              </button>
              <button onClick={collapseAll}
                className="text-xs text-gray-500 px-2.5 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50">
                Collapse all
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-16 text-center text-gray-400">Loading history…</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700 text-white text-xs">
                    <th className="w-8 px-3 py-2.5" />
                    <th className="text-left px-3 py-2.5 font-semibold">Lot / Invoice</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Supplier</th>
                    <th className="text-center px-3 py-2.5 font-semibold">Bags</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Total Qty</th>
                    <th className="text-right px-3 py-2.5 font-semibold">Remaining</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Received</th>
                    <th className="text-left px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGroups.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-14 text-gray-400">
                        {hasFilters ? 'No records match your filters.' : 'No inward history found.'}
                      </td>
                    </tr>
                  ) : (
                    paginatedGroups.map(g => {
                      const isOpen    = expanded.has(g.key)
                      const totalQty  = g.bags.reduce((s, b) => s + (Number(b.packQty) || 0), 0)
                      const remQty    = g.bags.reduce((s, b) => s + (b.remainingQty != null ? Number(b.remainingQty) : 0), 0)
                      const gStatus   = groupStatus(g.bags)
                      const sm        = statusMeta(gStatus)

                      return (
                        <>
                          {/* ── Group row ─────────────────────────────────── */}
                          <tr key={g.key}
                            onClick={() => toggle(g.key)}
                            className={`border-t border-gray-200 cursor-pointer select-none transition-colors ${
                              isOpen ? 'bg-indigo-50 hover:bg-indigo-100/60' : 'hover:bg-gray-50'
                            }`}>
                            <td className="px-3 py-3 text-center text-gray-400 text-xs">
                              {isOpen ? '▼' : '▶'}
                            </td>

                            <td className="px-3 py-3">
                              <div className="font-mono text-xs font-semibold text-gray-800">{g.lotNo || '—'}</div>
                              {g.invoiceNo && (
                                <div className="text-xs text-gray-400 mt-0.5">Inv: {g.invoiceNo}</div>
                              )}
                            </td>

                            <td className="px-3 py-3 text-sm text-gray-600">{g.supplier || '—'}</td>

                            <td className="px-3 py-3 text-center">
                              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                {g.bags.length}
                              </span>
                            </td>

                            <td className="px-3 py-3 text-right font-semibold text-gray-800 tabular-nums">
                              {fmtQty(totalQty)} <span className="text-xs text-gray-400 font-normal">{g.uom}</span>
                            </td>

                            <td className="px-3 py-3 text-right tabular-nums">
                              <span className={`font-semibold ${remQty > 0 ? 'text-emerald-600' : 'text-gray-400'}`}>
                                {fmtQty(remQty)}
                              </span>
                              {totalQty > 0 && (
                                <div className="text-[10px] text-gray-400">
                                  {Math.round(((totalQty - remQty) / totalQty) * 100)}% used
                                </div>
                              )}
                            </td>

                            <td className="px-3 py-3 text-sm text-gray-500">{fmtDate(g.receivedDate)}</td>

                            <td className="px-3 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${sm.cls}`}>
                                {sm.label}
                              </span>
                            </td>
                          </tr>

                          {/* ── Bag sub-rows ──────────────────────────────── */}
                          {isOpen && g.bags.map(bag => {
                            const bTotal  = Number(bag.packQty)      || 0
                            const bRem    = bag.remainingQty != null ? Number(bag.remainingQty) : bTotal
                            const bUsed   = Math.max(0, bTotal - bRem)
                            const bPct    = bTotal > 0 ? Math.min(100, (bUsed / bTotal) * 100) : 0
                            const bMeta   = statusMeta(bag.status)
                            const barCls  = bPct >= 100 ? 'bg-gray-400' : bPct >= 70 ? 'bg-amber-400' : 'bg-emerald-500'

                            return (
                              <tr key={bag.packId}
                                className="border-t border-gray-100 bg-slate-50">
                                <td className="px-3 py-2.5" />

                                {/* Bag no + pack ID */}
                                <td className="px-3 py-2.5" colSpan={1}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                                      {bag.bagNo || '—'}
                                    </div>
                                    <div>
                                      <div className="text-xs font-mono text-gray-600 leading-tight">{bag.packId}</div>
                                      <div className="text-[10px] text-gray-400">Bag #{bag.bagNo}</div>
                                    </div>
                                  </div>
                                </td>

                                {/* Supplier (same) */}
                                <td className="px-3 py-2.5 text-xs text-gray-400">{bag.supplier || '—'}</td>

                                {/* Empty bags cell */}
                                <td className="px-3 py-2.5" />

                                {/* Pack qty */}
                                <td className="px-3 py-2.5 text-right tabular-nums">
                                  <span className="text-xs font-semibold text-gray-700">{fmtQty(bTotal)}</span>
                                  <span className="text-xs text-gray-400 ml-1">{bag.uom}</span>
                                </td>

                                {/* Progress bar + remaining */}
                                <td className="px-3 py-2.5" colSpan={1}>
                                  <div className="flex flex-col gap-1 min-w-36">
                                    {/* bar */}
                                    <div className="flex items-center gap-2">
                                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className={`h-full rounded-full transition-all duration-500 ${barCls}`}
                                          style={{ width: `${bPct}%` }} />
                                      </div>
                                      <span className="text-[10px] text-gray-500 tabular-nums w-8 text-right flex-shrink-0">
                                        {Math.round(bPct)}%
                                      </span>
                                    </div>
                                    {/* labels */}
                                    <div className="flex justify-between text-[10px] text-gray-400">
                                      <span>Used: {fmtQty(bUsed)}</span>
                                      <span className="text-emerald-600 font-medium">{fmtQty(bRem)} left</span>
                                    </div>
                                  </div>
                                </td>

                                {/* Date */}
                                <td className="px-3 py-2.5 text-xs text-gray-400">{fmtDate(bag.receivedDate)}</td>

                                {/* Status badge */}
                                <td className="px-3 py-2.5">
                                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${bMeta.cls}`}>
                                    {bMeta.label}
                                  </span>
                                </td>
                              </tr>
                            )
                          })}
                        </>
                      )
                    })
                  )}
                </tbody>
              </table>
              <div className="px-4 pb-3">
                <Pagination page={page} total={filteredGroups.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
