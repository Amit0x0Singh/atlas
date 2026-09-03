import { useMemo, useState } from 'react'
import { Search, X, ChevronDown, ChevronRight, Loader2, Inbox, ClipboardList, Tag } from 'lucide-react'
import { useMicrobialOutward } from '../../../../../hooks/microbial/useMicrobialOutward.js'
import { PLANT_BADGE, PLANT_KEYS } from '../../../../production/planning/data/plantConfig.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { fmtCfu, fmtDateTime } from '../../utils/format.js'
import { printMicrobePicklist, printMicrobeLabels } from '../../utils/outwardPrintTemplates.js'

const STATUS_MODES = [['all', 'All'], ['in_progress', 'In progress'], ['completed', 'Completed']]

export default function OutwardHistory({ tasks = [] }) {
  const { data: outwards = [], isLoading } = useMicrobialOutward()

  const [search, setSearch] = useState('')
  const [plant, setPlant] = useState('')
  const [date, setDate] = useState('')
  const [statusMode, setStatusMode] = useState('all')
  const [expanded, setExpanded] = useState(null)

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  // One card per real-world outward session — grouped by product + DI
  // number + batch code (the identifiers actually shown on the card),
  // *not* plan_task_id: several separate "Confirm & Issue" submissions
  // against the same DI/batch can land under different (or missing)
  // plan_task_id values, which used to split one session into several
  // cards. Falls back to plan_task_id, then to the record's own id, only
  // when a session truly has no DI number or batch code to key off of.
  const groups = useMemo(() => {
    const map = new Map()
    for (const o of outwards) {
      const identifier = [o.di_number, o.batch_code].filter(Boolean).join('__')
      const key = identifier
        ? `${(o.product_name || '').toLowerCase()}__${identifier}`
        : (o.plan_task_id || `${(o.product_name || '').toLowerCase()}__${o.outward_id || ''}`)
      if (!map.has(key)) {
        map.set(key, {
          key,
          productName: o.product_name || '—',
          batchCode: o.batch_code || '',
          diNumber: o.di_number || '',
          customerName: o.customer_name || '',
          plant: '',
          completed: false,
          records: [],
        })
      }
      const g = map.get(key)
      g.records.push(o)
      // Plant/completed status comes from whichever record's plan_task_id
      // actually resolves to a live task — several records under one
      // session can carry different (or no) plan_task_id.
      const task = o.plan_task_id ? taskById.get(o.plan_task_id) : null
      if (task) {
        g.plant = task.plant || g.plant
        g.completed = g.completed || !!task.microbeIssueCompleted
      }
    }

    for (const g of map.values()) {
      g.records.sort((a, b) => new Date(a.issued_at) - new Date(b.issued_at))
      g.firstAt = g.records[0]?.issued_at
      g.lastAt = g.records[g.records.length - 1]?.issued_at
      // Section/Issuer/Receiver are per-record (each "Issue this microbe"
      // submission carries its own copy), but should read the same across
      // one merged session — most-recent-first non-null wins, so an older
      // sub-record saved before these were captured doesn't blank out a
      // value a later one in the same session actually has.
      const latestNonNull = (field) => {
        for (let i = g.records.length - 1; i >= 0; i--) {
          if (g.records[i][field]) return g.records[i][field]
        }
        return ''
      }
      g.section = latestNonNull('section')
      g.issuerName = latestNonNull('issuer_name')
      g.receiverName = latestNonNull('receiver_name')
      g.orderQtyKg = latestNonNull('order_qty_kg')
      const lines = g.records.flatMap((r) => (r.lines || []).map((l) => ({ ...l, issued_at: r.issued_at, issuer_name: r.issuer_name })))
      g.totalKg = lines.reduce((s, l) => s + Number(l.qty_issued_kg || 0), 0)
      // Regroup lines by microbe
      const byMic = new Map()
      for (const l of lines) {
        if (!byMic.has(l.microbe_code)) byMic.set(l.microbe_code, { microbe_code: l.microbe_code, microbe_name: l.microbe_name, picks: [] })
        byMic.get(l.microbe_code).picks.push(l)
      }
      g.microbes = [...byMic.values()]
      g.status = g.completed ? 'completed' : 'in_progress'
    }

    return [...map.values()].sort((a, b) => new Date(b.lastAt) - new Date(a.lastAt))
  }, [outwards, taskById])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.filter((g) => {
      if (statusMode !== 'all' && g.status !== statusMode) return false
      if (plant && g.plant !== plant) return false
      if (date && !(g.firstAt?.slice(0, 10) === date || g.lastAt?.slice(0, 10) === date)) return false
      if (!q) return true
      return (
        [g.productName, g.batchCode, g.diNumber].some((v) => String(v || '').toLowerCase().includes(q)) ||
        g.microbes.some((m) => (m.microbe_name || '').toLowerCase().includes(q))
      )
    })
  }, [groups, search, plant, date, statusMode])

  const hasFilters = !!(search.trim() || plant || date || statusMode !== 'all')
  const clear = () => { setSearch(''); setPlant(''); setDate(''); setStatusMode('all') }
  const field = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-900">Outward History</h3>
        <p className="text-xs text-gray-500 mt-0.5">Every microbe issuance grouped by the production task it was issued against.</p>
      </div>

      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, batch, DI or microbe…" className={`${field} w-full pl-9`} />
        </div>
        <select value={plant} onChange={(e) => setPlant(e.target.value)} className={`${field} cursor-pointer`}>
          <option value="">All plants</option>
          {PLANT_KEYS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={`${field} cursor-pointer`} />
        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {STATUS_MODES.map(([m, label]) => (
            <button key={m} type="button" onClick={() => setStatusMode(m)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${statusMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        {hasFilters && (
          <button type="button" onClick={clear} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="py-14 text-center text-gray-400"><Loader2 size={20} className="animate-spin mx-auto mb-2" />Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <Inbox size={26} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">{hasFilters ? 'Nothing matches your filters' : 'No microbe issuances yet'}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[560px] overflow-y-auto">
          {filtered.map((g) => {
            const open = expanded === g.key
            return (
              <div key={g.key}>
                <div onClick={() => setExpanded(open ? null : g.key)}
                  className={`w-full text-left px-5 py-3 flex items-start gap-3 cursor-pointer transition-colors ${open ? 'bg-blue-50/50' : 'hover:bg-gray-50'}`}>
                  {open ? <ChevronDown size={16} className="text-gray-400 mt-0.5 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {toTitleCase(g.productName)}{g.customerName ? <span className="text-gray-400 font-normal"> — {toTitleCase(g.customerName)}</span> : null}
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${g.completed ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                        {g.completed ? 'Completed' : 'In progress'}
                      </span>
                    </div>
                    <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 flex-wrap text-[11px] text-gray-400">
                      {g.plant && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PLANT_BADGE[g.plant] || 'bg-gray-100 text-gray-600'}`}>{g.plant}</span>}
                      {g.batchCode && <span className="font-mono">{g.batchCode}</span>}
                      {g.diNumber && <span>{g.diNumber}</span>}
                      <span className="font-medium text-gray-600">{g.microbes.length} microbe{g.microbes.length !== 1 ? 's' : ''}</span>
                      <span className="font-medium text-red-600">−{g.totalKg.toFixed(3)} kg</span>
                      <span>{fmtDateTime(g.firstAt)}{g.firstAt !== g.lastAt ? ` → ${fmtDateTime(g.lastAt)}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 flex-wrap text-[11px] text-gray-400">
                      <span>Section: <b className="text-gray-600 font-semibold">{g.section ? toTitleCase(g.section) : '—'}</b></span>
                      <span>Issuer: <b className="text-gray-600 font-semibold">{g.issuerName ? toTitleCase(g.issuerName) : '—'}</b></span>
                      <span>Receiver: <b className="text-gray-600 font-semibold">{g.receiverName ? toTitleCase(g.receiverName) : '—'}</b></span>
                    </div>
                  </div>
                  {/* Picklist tells the store person which rack/shelf to pick
                      each container from; Labels get attached to the picked
                      pack/bag so the receiver can read what's inside without
                      opening it. Both reprint anytime from history. */}
                  <div className="flex gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button type="button" onClick={() => printMicrobePicklist(g)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                      <ClipboardList size={12} /> Picklist
                    </button>
                    <button type="button" onClick={() => printMicrobeLabels(g)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 hover:text-amber-900 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg transition whitespace-nowrap">
                      <Tag size={12} /> Labels
                    </button>
                  </div>
                </div>

                {open && (
                  <div className="px-5 pb-4 pl-12 space-y-3">
                    {g.microbes.map((m) => (
                      <div key={m.microbe_code}>
                        <div className="text-xs font-semibold text-gray-700 mb-1">
                          {toTitleCase(m.microbe_name)} <span className="text-gray-400 font-mono">({m.microbe_code})</span>
                          <span className="ml-2 text-gray-400 font-normal">
                            {m.picks.reduce((s, p) => s + Number(p.qty_issued_kg || 0), 0).toFixed(3)} kg total
                          </span>
                        </div>
                        <div className="space-y-1">
                          {m.picks.map((p, i) => (
                            <div key={p.line_id || i} className="flex items-center justify-between text-[11px] bg-gray-50 rounded-lg px-3 py-2">
                              <div className="min-w-0">
                                <span className="font-mono text-gray-700">{p.container_code}</span>
                                {p.is_partial && <span className="ml-1.5 text-amber-600 font-semibold">(partial)</span>}
                                <div className="text-gray-400">
                                  CFU/g at issue {fmtCfu(p.cfu_per_g_at_issue)} · {fmtDateTime(p.issued_at)}{p.issuer_name ? ` · by ${toTitleCase(p.issuer_name)}` : ''}
                                </div>
                              </div>
                              <div className="font-bold text-gray-900 shrink-0">{Number(p.qty_issued_kg).toFixed(3)} kg</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
