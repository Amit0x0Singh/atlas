import './GrnList.css'
import { useMemo } from 'react'
import { Search, Package, Layers, FileText, X, SlidersHorizontal } from 'lucide-react'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'
import { EMPTY_GRN_FILTERS } from '../grn-filter/GrnFilterModal.jsx'

// Bucket a (newest-first) GRN list into day groups, preserving order. The
// backend already sorts by received date desc, so we only need to walk the
// list and start a new group whenever the calendar day changes.
function groupByDay(list) {
  const groups = []
  let current = null
  for (const grn of list) {
    const raw = grn.receivedDate || grn.createdAt
    const key = raw ? new Date(raw).toDateString() : 'unknown'
    if (!current || current.key !== key) {
      current = { key, date: raw ? new Date(raw) : null, items: [] }
      groups.push(current)
    }
    current.items.push(grn)
  }
  return groups
}

function relativeDayLabel(date) {
  if (!date) return 'Undated'
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  const diffDays = Math.round((today - d) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
}

const shortDate = (v) => new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

// One removable chip per active facet.
function activeFilterChips(filters) {
  const chips = []
  if (filters.fromDate || filters.toDate) {
    const label = filters.fromDate && filters.toDate
      ? `${shortDate(filters.fromDate)} – ${shortDate(filters.toDate)}`
      : filters.fromDate ? `From ${shortDate(filters.fromDate)}` : `Until ${shortDate(filters.toDate)}`
    chips.push({ keys: ['fromDate', 'toDate'], label })
  }
  if (filters.supplier) chips.push({ keys: ['supplier'], label: toTitleCase(filters.supplier) })
  if (filters.company)  chips.push({ keys: ['company'],  label: filters.company })
  if (filters.minBags !== '' && filters.minBags != null) chips.push({ keys: ['minBags'], label: `≥ ${filters.minBags} bags` })
  return chips
}

export default function GrnList({
  list, totalCount, loading, search, filters = EMPTY_GRN_FILTERS, activeFilterCount = 0,
  onSearch, onOpenFilter, onChangeFilters, selected, onSelect,
}) {
  const groups = useMemo(() => groupByDay(list), [list])
  const hasSearch = !!search.trim()
  const chips = useMemo(() => activeFilterChips(filters), [filters])
  const narrowed = hasSearch || activeFilterCount > 0

  const removeChip = (keys) => onChangeFilters({ ...filters, ...Object.fromEntries(keys.map(k => [k, ''])) })
  const clearAll = () => { onChangeFilters(EMPTY_GRN_FILTERS); onSearch('') }

  return (
    <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 flex flex-col overflow-hidden">
      {/* ─── Header ─── */}
      <div className="px-4 pt-4 pb-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900 text-sm tracking-tight">Goods Received Notes</h2>
          {!loading && (
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5 tabular-nums">
              {narrowed ? `${list.length} / ${totalCount}` : list.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search item, invoice, supplier…"
              value={search}
              onChange={e => onSearch(e.target.value)}
              className="w-full border border-gray-300 rounded-lg pl-8 pr-8 py-2 text-xs text-gray-900 outline-none transition
                focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white placeholder:text-gray-400"
            />
            {hasSearch && (
              <button
                type="button"
                onClick={() => onSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenFilter}
            className={`relative flex-shrink-0 h-[34px] w-[34px] rounded-lg border flex items-center justify-center transition
              ${activeFilterCount > 0
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                : 'border-gray-300 bg-white text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}
            aria-label="Filter GRNs"
            title="Filter GRNs"
          >
            <SlidersHorizontal size={15} />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white
                text-[10px] font-bold flex items-center justify-center tabular-nums">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Active filter chips */}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {chips.map(chip => (
              <span key={chip.keys.join('-')}
                className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-full pl-2 pr-1 py-0.5">
                {chip.label}
                <button type="button" onClick={() => removeChip(chip.keys)} className="hover:bg-indigo-100 rounded-full p-0.5" aria-label="Remove filter">
                  <X size={11} />
                </button>
              </span>
            ))}
            <button type="button" onClick={clearAll} className="text-[11px] font-semibold text-gray-400 hover:text-gray-600 px-1 self-center">
              Clear
            </button>
          </div>
        )}
      </div>

      {/* ─── Body ─── */}
      <div className="flex-1 overflow-y-auto grn-list-scroll">
        {loading ? (
          <div className="p-3 space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-[68px] rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : list.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <div className="mx-auto w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <FileText size={18} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-500">
              {narrowed ? 'No GRNs match' : 'No GRNs yet'}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {narrowed ? 'Adjust the search or filters.' : 'Scan bags in Raw Material Inward to create one.'}
            </p>
            {narrowed && (
              <button type="button" onClick={clearAll} className="mt-3 text-xs font-semibold text-indigo-600 hover:underline">
                Clear search & filters
              </button>
            )}
          </div>
        ) : (
          groups.map(group => (
            <div key={group.key}>
              <div className="sticky top-0 z-10 px-4 py-1.5 bg-gray-50/95 backdrop-blur-sm border-b border-gray-100
                text-[10px] font-bold uppercase tracking-wider text-gray-500 flex items-center justify-between">
                <span>{relativeDayLabel(group.date)}</span>
                <span className="text-gray-400 font-semibold">{group.items.length}</span>
              </div>
              <div className="p-2 space-y-1.5">
                {group.items.map(grn => {
                  const active = selected?.gateInwardId === grn.gateInwardId
                  return (
                    <button
                      key={grn.gateInwardId}
                      onClick={() => onSelect(grn)}
                      className={`w-full text-left rounded-xl border px-3 py-2.5 transition-all
                        ${active
                          ? 'border-indigo-300 bg-indigo-50 ring-1 ring-indigo-200 shadow-sm'
                          : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className={`font-semibold text-[13px] truncate ${active ? 'text-indigo-900' : 'text-gray-900'}`}>
                            {grn.invoiceNo}
                          </p>
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">{toTitleCase(grn.supplier)}</p>
                        </div>
                        {grn.company && (
                          <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-gray-400
                            border border-gray-200 rounded px-1.5 py-0.5 mt-0.5">
                            {grn.company}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Package size={12} className="text-gray-400" />
                          <span className="font-semibold text-gray-700 tabular-nums">{grn.totalPacks}</span> bags
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Layers size={12} className="text-gray-400" />
                          <span className="font-semibold text-gray-700 tabular-nums">{grn.uniqueItems}</span>
                          {grn.uniqueItems === 1 ? ' item' : ' items'}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
