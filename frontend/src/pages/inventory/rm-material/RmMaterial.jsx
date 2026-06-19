import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { stockApi } from '../../../api/inventory.js'
import BackButton from '../../../components/erp/BackButton.jsx'

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

export default function RmMaterial() {
  const navigate = useNavigate()
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [search,  setSearch]  = useState('')
  const [stockFilter, setStockFilter] = useState('all') // all | in_stock | out_of_stock

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true); setError('')
    try {
      const r = await stockApi.summary()
      setItems(r.data || [])
    } catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    return items.filter(it => {
      if (search) {
        const q = search.toLowerCase()
        if (!it.itemName?.toLowerCase().includes(q) && !it.itemCode?.toLowerCase().includes(q)) return false
      }
      if (stockFilter === 'in_stock'     && it.totalStock <= 0) return false
      if (stockFilter === 'out_of_stock' && it.totalStock  > 0) return false
      return true
    })
  }, [items, search, stockFilter])

  const inStockCount    = items.filter(i => i.totalStock  > 0).length
  const outOfStockCount = items.filter(i => i.totalStock <= 0).length

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-7">

        {/* Header */}
        <div className="flex justify-between items-start mb-7">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Raw Materials</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Stock overview · {items.length} items registered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load}
              className="w-8 h-8 flex items-center justify-center rounded-xl border border-gray-200 bg-white shadow-sm hover:bg-gray-50 text-gray-400 hover:text-gray-900 transition text-lg"
              title="Refresh">↻</button>
            <BackButton />
          </div>
        </div>

        {/* Quick stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Total Items</div>
              <div className="text-3xl font-bold text-gray-900">{items.length}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">In Stock</div>
              <div className="text-3xl font-bold text-emerald-600">{inStockCount}</div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
              <div className="text-xs font-medium text-gray-400 mb-1.5">Out of Stock</div>
              <div className="text-3xl font-bold text-red-500">{outOfStockCount}</div>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-5 px-4 py-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">{error}</div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 mb-4 flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-56">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by raw material name or code…"
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {[
              { key: 'all',           label: 'All'         },
              { key: 'in_stock',      label: 'In Stock'    },
              { key: 'out_of_stock',  label: 'Out of Stock'},
            ].map(f => (
              <button key={f.key} onClick={() => setStockFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  stockFilter === f.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          {(search || stockFilter !== 'all') && (
            <button onClick={() => { setSearch(''); setStockFilter('all') }}
              className="text-xs text-red-500 hover:text-red-700 px-3 py-2 border border-red-200 rounded-lg hover:bg-red-50">
              × Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Raw Material Register</span>
            {!loading && (
              <span className="text-xs text-gray-400">
                {filtered.length} of {items.length} items
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-700 text-white text-xs">
                  <th className="text-left px-4 py-3 font-semibold">#</th>
                  <th className="text-left px-4 py-3 font-semibold">Raw Material</th>
                  <th className="text-center px-4 py-3 font-semibold">UOM</th>
                  <th className="text-right px-4 py-3 font-semibold">In Pack</th>
                  <th className="text-right px-4 py-3 font-semibold">In Container</th>
                  <th className="text-right px-4 py-3 font-semibold">Total Qty</th>
                  <th className="text-center px-4 py-3 font-semibold">Details</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(8)].map((_, i) => <SkeletonRow key={i} />)
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-gray-400">
                      {search || stockFilter !== 'all'
                        ? 'No items match your filters.'
                        : 'No raw materials found.'}
                    </td>
                  </tr>
                ) : (
                  filtered.map((it, idx) => {
                    const hasStock = it.totalStock > 0
                    return (
                      <tr key={it.itemCode}
                        className="border-t border-gray-100 hover:bg-gray-50 transition-colors group">
                        <td className="px-4 py-3 text-xs text-gray-400 tabular-nums">{idx + 1}</td>

                        {/* Name + code */}
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-900 group-hover:text-indigo-700 transition-colors">
                            {it.itemName}
                          </div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">{it.itemCode}</div>
                        </td>

                        {/* UOM */}
                        <td className="px-4 py-3 text-center">
                          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-md">
                            {it.uom || '—'}
                          </span>
                        </td>

                        {/* In Pack */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div><StockBadge value={it.stockInPacks} /></div>
                          {it.activePacks > 0 && (
                            <div className="text-xs text-gray-400 mt-0.5">{it.activePacks} bag{it.activePacks !== 1 ? 's' : ''}</div>
                          )}
                        </td>

                        {/* In Container */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          <StockBadge value={it.stockInContainer} />
                        </td>

                        {/* Total */}
                        <td className="px-4 py-3 text-right tabular-nums">
                          <div className={`text-base font-bold tabular-nums ${hasStock ? 'text-gray-900' : 'text-red-400'}`}>
                            {fmt(it.totalStock)}
                          </div>
                          {!hasStock && (
                            <div className="text-[10px] text-red-400 font-medium">OUT OF STOCK</div>
                          )}
                        </td>

                        {/* View details */}
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => navigate(`/rm-material/${encodeURIComponent(it.itemCode)}`)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-lg hover:bg-gray-700 transition-colors">
                            View Details
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}
