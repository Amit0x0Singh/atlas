import { useState, useMemo, useEffect } from 'react'
import {
  Archive, Search, FileSpreadsheet, Printer, Download,
  FileText, Package, Layers, Hash, X, SlidersHorizontal,
  ArrowUp, ArrowDown, ArrowUpDown,
} from 'lucide-react'
import { fmtDate } from '../../utils/bomPrintTemplates.js'
import { printBoms, bomTitle } from '../../utils/bomIssuancePrint.js'
import { PLANT_BADGE } from '../../data/plantConfig.js'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

import { toTitleCase } from '../../../../../utils/textDisplay.js'

const STAT_ICON = { total: FileText, products: Package, recipes: Layers, last: Hash }

// Deterministic accent colour per product so the same product reads the same
// everywhere in the list — purely cosmetic (the dot beside the name).
const DOT_COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#ef4444']
const dotFor = (name = '') => {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return DOT_COLORS[h % DOT_COLORS.length]
}

const issuedDay = (b) => {
  const raw = b.issuedAt || b.dateRequisition
  if (!raw) return ''
  try { return new Date(raw).toISOString().slice(0, 10) } catch { return String(raw).slice(0, 10) }
}

// Each sortable column: how to read its value + whether it sorts numerically.
// `dir` is the direction applied the first time you click that column.
const SORTS = {
  bomNo:      { label: 'BOM Number', get: b => b.bomNo || '',                     num: false, dir: 'asc'  },
  product:    { label: 'Product',    get: b => (b.productName || '').toLowerCase(), num: false, dir: 'asc'  },
  plant:      { label: 'Plant',      get: b => b.section || '',                    num: false, dir: 'asc'  },
  batchSize:  { label: 'Batch Size', get: b => parseFloat(b.batchSize) || 0,       num: true,  dir: 'desc' },
  batchNo:    { label: 'Batch No',   get: b => b.batchNo || '',                    num: false, dir: 'asc'  },
  issued:     { label: 'Date Issued', get: b => issuedDay(b),                      num: false, dir: 'desc' },
  planned:    { label: 'Batch Planned', get: b => b.datePlanned || '',             num: false, dir: 'desc' },
  cycle:      { label: 'Cycle',      get: b => b.cycleNo || 0,                     num: true,  dir: 'asc'  },
  diNo:       { label: 'DI No',      get: b => b.diNumber || '',                   num: false, dir: 'asc'  },
}

const PAGE_SIZE_DEFAULT = 15

function CyclePill({ n, total }) {
  const t = Math.max(1, total || 1)
  const pct = Math.round((Math.min(n, t) / t) * 100)
  return (
    <span className="inline-flex items-center gap-1.5" title={`Cycle ${n} of ${t}`}>
      <span className="relative h-1.5 w-10 rounded-full bg-slate-200 overflow-hidden">
        <span className="absolute inset-y-0 left-0 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-[11px] font-semibold text-slate-500 tabular-nums">{n}/{t}</span>
    </span>
  )
}

// Sortable <th> — click to sort by this column, click again to flip direction.
function Th({ id, sortKey, sortDir, onSort, align = 'left', children }) {
  const active = sortKey === id
  const right = align === 'right'
  const Icon = !active ? ArrowUpDown : sortDir === 'asc' ? ArrowUp : ArrowDown
  return (
    <th className={`font-semibold px-4 py-3 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(id)}
        className={`inline-flex items-center gap-1 uppercase tracking-wider transition-colors hover:text-white ${active ? 'text-white' : ''}`}
      >
        {right && <Icon size={12} className={active ? 'opacity-90' : 'opacity-40'} />}
        {children}
        {!right && <Icon size={12} className={active ? 'opacity-90' : 'opacity-40'} />}
      </button>
    </th>
  )
}

export default function ArchiveTab({ boms, recipeCount, meta }) {
  const [search, setSearch]         = useState('')
  const [prodFilter, setProdFilter] = useState('')
  const [plantFilter, setPlantFilter] = useState('')
  const [fromDate, setFromDate]     = useState('')
  const [toDate, setToDate]         = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [copyMsg, setCopyMsg]       = useState('')

  const [sortKey, setSortKey] = useState('issued')
  const [sortDir, setSortDir] = useState('desc')

  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT)

  const products = useMemo(
    () => [...new Set(boms.map(b => b.productName))].sort((a, b) => a.localeCompare(b)),
    [boms],
  )
  const plants = useMemo(
    () => [...new Set(boms.map(b => b.section).filter(Boolean))].sort(),
    [boms],
  )

  const filtered = useMemo(() => {
    const pf = prodFilter.toLowerCase()
    const sq = search.trim().toLowerCase()
    return boms.filter(b => {
      if (pf && !b.productName.toLowerCase().includes(pf)) return false
      if (plantFilter && b.section !== plantFilter) return false
      const day = issuedDay(b)
      if (fromDate && day && day < fromDate) return false
      if (toDate && day && day > toDate) return false
      if (sq) {
        const hit = b.bomNo.toLowerCase().includes(sq)
          || (b.batchNo || '').toLowerCase().includes(sq)
          || (b.diNumber || '').toLowerCase().includes(sq)
          || b.productName.toLowerCase().includes(sq)
        if (!hit) return false
      }
      return true
    })
  }, [boms, search, prodFilter, plantFilter, fromDate, toDate])

  const sorted = useMemo(() => {
    const cfg = SORTS[sortKey] || SORTS.issued
    const factor = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      const av = cfg.get(a), bv = cfg.get(b)
      if (cfg.num) return (av - bv) * factor
      return String(av).localeCompare(String(bv)) * factor
    })
  }, [filtered, sortKey, sortDir])

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize))
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  )

  // Snap back to a valid page whenever the result set shrinks under us.
  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [page, totalPages])
  // Any filter/search/sort change starts the reader back at the top.
  useEffect(() => { setPage(1) }, [search, prodFilter, plantFilter, fromDate, toDate, sortKey, sortDir, pageSize])

  const hasFilters = !!(search.trim() || prodFilter || plantFilter || fromDate || toDate)
  const activeFilterCount = [prodFilter, plantFilter, fromDate, toDate].filter(Boolean).length

  const onSort = (id) => {
    if (sortKey === id) { setSortDir(d => (d === 'asc' ? 'desc' : 'asc')); return }
    setSortKey(id)
    setSortDir(SORTS[id]?.dir || 'asc')
  }

  const clearAll = () => {
    setSearch(''); setProdFilter(''); setPlantFilter(''); setFromDate(''); setToDate('')
  }

  const stats = [
    { key: 'total',    label: 'Total BOMs Issued', val: boms.length },
    { key: 'products', label: 'Unique Products',   val: new Set(boms.map(b => b.productName)).size },
    { key: 'recipes',  label: 'Recipes in Master', val: recipeCount },
    { key: 'last',     label: 'Last BOM No',       val: meta?.lastBomNo || '—', mono: true },
  ]

  const flashCopy = (msg) => { setCopyMsg(msg); setTimeout(() => setCopyMsg(''), 3500) }

  const copyForExcel = async () => {
    const header = ['BOM Number', 'Product Name', 'Batch Size', 'UOM', 'Batch No', 'Date Issued', 'Batch Planned', 'Cycle', 'DI No'].join('\t')
    const lines = sorted.map(b => [
      b.bomNo, b.productName, b.batchSize, b.batchSizeUom, b.batchNo,
      fmtDate(b.issuedAt || b.dateRequisition), fmtDate(b.datePlanned),
      `${b.cycleNo}/${b.totalCycles}`, b.diNumber || '',
    ].join('\t'))
    const text = [header, ...lines].join('\n')
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    }
    flashCopy(`Copied ${sorted.length} row(s) — paste into Excel`)
  }

  const printAll = () => {
    if (!sorted.length) return
    printBoms(sorted, `BOM_Archive_${sorted.length}`)
  }

  const fieldCls = 'border border-slate-200 rounded-lg px-3 py-2 text-[13px] bg-white outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400'

  return (
    <div className="p-6 max-w-[1500px] mx-auto">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center flex-shrink-0">
            <Archive size={18} />
          </span>
          <div>
            <h2 className="text-[16px] font-bold text-slate-900 leading-tight">BOM Archive</h2>
            <p className="text-[12px] text-slate-400 leading-tight mt-0.5">
              Every BOM issued from this page — reprint, export or search by batch.
            </p>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={printAll} disabled={!sorted.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <Printer size={14} /> Print all
          </button>
          <button onClick={copyForExcel} disabled={!sorted.length}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <FileSpreadsheet size={14} /> Copy for Excel
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {stats.map(s => {
          const Icon = STAT_ICON[s.key]
          return (
            <div key={s.key} className="bg-white border border-slate-200 rounded-xl px-4 py-3.5 shadow-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon size={14} className="text-slate-300" />
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{s.label}</span>
              </div>
              <div className={`font-bold text-slate-900 ${s.mono ? 'text-[15px] font-mono break-all leading-tight' : 'text-[22px]'}`}>
                {s.val}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 mb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search BOM No, Batch No or DI No…"
              className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-[13px] outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400" />
          </div>

          <button onClick={() => setShowFilters(v => !v)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 text-[12.5px] font-semibold rounded-lg border transition-colors ${
              showFilters || activeFilterCount
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            <SlidersHorizontal size={14} /> Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 text-[10px] font-bold bg-indigo-600 text-white rounded-full w-4 h-4 grid place-items-center">{activeFilterCount}</span>
            )}
          </button>

          {/* Sort — mirrors the clickable table headers, and is the only
              sort control on mobile where the header row is hidden. */}
          <div className="inline-flex items-center gap-1.5">
            <select value={sortKey} onChange={e => setSortKey(e.target.value)}
              className={`${fieldCls} cursor-pointer`} aria-label="Sort by">
              {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>Sort: {v.label}</option>)}
            </select>
            <button onClick={() => setSortDir(d => (d === 'asc' ? 'desc' : 'asc'))}
              title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50">
              {sortDir === 'asc' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
            </button>
          </div>

          <span className="text-[12px] text-slate-400 ml-auto whitespace-nowrap">
            {sorted.length === boms.length
              ? `${boms.length} BOM${boms.length !== 1 ? 's' : ''}`
              : `${sorted.length} of ${boms.length}`}
          </span>
        </div>

        {showFilters && (
          <div className="flex items-end gap-3 flex-wrap mt-2.5 pt-2.5 border-t border-slate-100">
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-400">
              Product
              <select value={prodFilter} onChange={e => setProdFilter(e.target.value)} className={`${fieldCls} w-52`}>
                <option value="">All products</option>
                {products.map(p => <option key={p} value={p}>{toTitleCase(p)}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-400">
              Plant
              <select value={plantFilter} onChange={e => setPlantFilter(e.target.value)} className={`${fieldCls} w-40`}>
                <option value="">All plants</option>
                {plants.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-400">
              Issued from
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={fieldCls} />
            </label>
            <label className="flex flex-col gap-1 text-[11px] font-semibold text-slate-400">
              Issued to
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={fieldCls} />
            </label>
            {hasFilters && (
              <button onClick={clearAll}
                className="inline-flex items-center gap-1 text-[12px] font-semibold text-slate-400 hover:text-slate-700 py-2">
                <X size={13} /> Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {copyMsg && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-[12px] font-medium rounded-lg px-3.5 py-2 mb-3">
          <FileSpreadsheet size={13} className="flex-shrink-0" /> {copyMsg}
        </div>
      )}

      {/* ── Empty ───────────────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl text-center py-16 px-6">
          <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-300 grid place-items-center mx-auto mb-3">
            <Archive size={22} />
          </div>
          <p className="font-semibold text-slate-500 text-[14px]">
            {hasFilters ? 'No BOMs match your search' : 'No BOMs issued yet'}
          </p>
          <p className="text-[12px] text-slate-400 mt-1">
            {hasFilters ? 'Try clearing the filters.' : 'Issue a BOM from the Issue BOM tab to see it here.'}
          </p>
        </div>
      ) : (
        <>
          {/* ── Table (md+) ──────────────────────────────────────────── */}
          <div className="hidden md:block bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-[12.5px]">
                <thead>
                  <tr className="bg-slate-800 text-slate-300 text-[10.5px]">
                    <Th id="bomNo"     sortKey={sortKey} sortDir={sortDir} onSort={onSort}>BOM Number</Th>
                    <Th id="product"   sortKey={sortKey} sortDir={sortDir} onSort={onSort}>Product</Th>
                    <Th id="plant"     sortKey={sortKey} sortDir={sortDir} onSort={onSort}>Plant</Th>
                    <Th id="batchSize" sortKey={sortKey} sortDir={sortDir} onSort={onSort} align="right">Batch Size</Th>
                    <Th id="batchNo"   sortKey={sortKey} sortDir={sortDir} onSort={onSort}>Batch No</Th>
                    <Th id="issued"    sortKey={sortKey} sortDir={sortDir} onSort={onSort}>Issued</Th>
                    <Th id="planned"   sortKey={sortKey} sortDir={sortDir} onSort={onSort}>Planned</Th>
                    <Th id="cycle"     sortKey={sortKey} sortDir={sortDir} onSort={onSort}>Cycle</Th>
                    <Th id="diNo"      sortKey={sortKey} sortDir={sortDir} onSort={onSort}>DI No</Th>
                    <th className="text-right font-semibold px-4 py-3 whitespace-nowrap uppercase tracking-wider">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.map(b => (
                    <tr key={b.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-[11.5px] font-semibold text-slate-800 whitespace-nowrap">{b.bomNo}</td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center gap-2 font-medium text-slate-800">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotFor(b.productName) }} />
                          <span className="truncate max-w-[180px]">{toTitleCase(b.productName)}</span>
                        </span>
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap">
                        {b.section
                          ? <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${PLANT_BADGE[b.section] || 'bg-slate-100 text-slate-500'}`}>{b.section}</span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right font-semibold text-slate-700 whitespace-nowrap tabular-nums">
                        {b.batchSize} <span className="text-[10px] text-slate-400 font-normal">{(b.batchSizeUom || '').toUpperCase()}</span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11.5px] text-slate-600 whitespace-nowrap">{b.batchNo}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(b.issuedAt || b.dateRequisition)}</td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{fmtDate(b.datePlanned) || '—'}</td>
                      <td className="px-4 py-2.5 whitespace-nowrap"><CyclePill n={b.cycleNo} total={b.totalCycles} /></td>
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{b.diNumber || '—'}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <button onClick={() => printBoms([b], bomTitle(b))} title="Reprint / Save as PDF"
                          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors">
                          <Download size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap px-4 border-t border-slate-100">
              <span className="text-[12px] text-slate-400">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, sorted.length)} of {sorted.length}
              </span>
              <Pagination
                page={page}
                total={sorted.length}
                limit={pageSize}
                onChange={setPage}
                onLimitChange={setPageSize}
              />
            </div>
          </div>

          {/* ── Cards (mobile) ───────────────────────────────────────── */}
          <div className="md:hidden space-y-2.5">
            {pageRows.map(b => (
              <div key={b.id} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono text-[11px] font-semibold text-slate-800 truncate">{b.bomNo}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: dotFor(b.productName) }} />
                      <span className="font-semibold text-[13px] text-slate-800 truncate">{toTitleCase(b.productName)}</span>
                    </div>
                  </div>
                  <button onClick={() => printBoms([b], bomTitle(b))} title="Reprint / Save as PDF"
                    className="flex-shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-colors">
                    <Download size={14} />
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2.5 text-[11.5px] text-slate-500">
                  <span>Batch: <b className="text-slate-700 font-mono">{b.batchNo}</b></span>
                  <span>Size: <b className="text-slate-700">{b.batchSize} {(b.batchSizeUom || '').toUpperCase()}</b></span>
                  <span>Issued: <b className="text-slate-700">{fmtDate(b.issuedAt || b.dateRequisition)}</b></span>
                  <span>Planned: <b className="text-slate-700">{fmtDate(b.datePlanned) || '—'}</b></span>
                  <span>DI: <b className="text-slate-700">{b.diNumber || '—'}</b></span>
                  <span className="flex items-center gap-1.5">Cycle: <CyclePill n={b.cycleNo} total={b.totalCycles} /></span>
                </div>
                {b.section && (
                  <span className={`inline-block mt-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${PLANT_BADGE[b.section] || 'bg-slate-100 text-slate-500'}`}>{b.section}</span>
                )}
              </div>
            ))}
            <div className="pt-1">
              <Pagination
                page={page}
                total={sorted.length}
                limit={pageSize}
                onChange={setPage}
                onLimitChange={setPageSize}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
