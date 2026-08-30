import { useMemo, useState } from 'react'
import { Loader2, ClipboardList, FlaskConical, Search, PlayCircle, X } from 'lucide-react'
import { PLANT_BADGE, PLANT_KEYS, statusBadgeCls } from '../../../../production/planning/data/plantConfig.js'
import { fmtDate } from '../../utils/format.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

// One list, two kinds of row:
//   • task    — a planned batch the planner sent, not yet started → click to open
//   • session — an issuance already opened but not confirmed → Resume / Discard
// (A task flips to a session the moment it's opened, so the two sets never
// overlap.) Same production_tasks pool as Material Issue by BOM.
const STATUS_MODES = [
  ['all', 'All'],
  ['task', 'To issue'],
  ['session', 'In progress'],
]

export default function TaskPicker({
  tasks, loadingTasks, taskFilter, setTaskFilter, onSelectTask, checking,
  sessions = [], loadingSessions, onResumeSession,
}) {
  const [search, setSearch] = useState('')
  const [statusMode, setStatusMode] = useState('all')

  const taskById = useMemo(() => new Map(tasks.map((t) => [t.id, t])), [tasks])

  const items = useMemo(() => {
    const sessionItems = sessions.map((s) => {
      const t = taskById.get(s.plan_task_id)
      return {
        kind: 'session', key: `s-${s.id}`, raw: s,
        productName: s.header?.product_name || t?.productName || 'Untitled issuance',
        plant: t?.plant || '',
        date: t?.date || (s.updated_at ? String(s.updated_at).slice(0, 10) : ''),
        qty: t?.qty, qtyUom: t?.qtyUom,
        batchCode: s.header?.batch_code || t?.batchCode || '',
        diNo: s.header?.di_number || t?.diNo || '',
        microbeCount: (s.rows || []).length,
        savedAt: s.updated_at,
      }
    })

    const taskItems = tasks
      .filter((t) => t.sent && t.status !== 'Completed' && !t.microbeIssueStarted && !t.microbeIssueCompleted)
      .map((t) => ({
        kind: 'task', key: `t-${t.id}`, raw: t,
        productName: t.productName, plant: t.plant, date: t.date,
        qty: t.qty, qtyUom: t.qtyUom, batchCode: t.batchCode, diNo: t.diNo, status: t.status,
      }))

    const q = search.trim().toLowerCase()
    return [...sessionItems, ...taskItems].filter((it) => {
      if (statusMode !== 'all' && it.kind !== statusMode) return false
      if (taskFilter.plant && it.plant !== taskFilter.plant) return false
      if (taskFilter.date && it.date !== taskFilter.date) return false
      if (!q) return true
      return [it.productName, it.batchCode, it.diNo, it.plant].some((v) => String(v || '').toLowerCase().includes(q))
    })
  }, [tasks, sessions, taskById, search, statusMode, taskFilter.plant, taskFilter.date])

  const sessionCount = items.filter((i) => i.kind === 'session').length
  const taskCount = items.filter((i) => i.kind === 'task').length
  const loading = loadingTasks || loadingSessions
  const hasFilters = !!(search.trim() || taskFilter.plant || taskFilter.date || statusMode !== 'all')

  const clearFilters = () => { setSearch(''); setStatusMode('all'); setTaskFilter({ plant: '', date: '' }) }

  const field = 'border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400'

  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-base font-bold text-gray-900">Select Production Task</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          Microbes are issued against a planned batch's recipe. Pick a task to start, or resume one you already opened —
          its product, batch, DI number and microbe requirements are pulled in automatically.
        </p>
      </div>

      {/* Toolbar */}
      <div className="px-5 py-3 border-b border-gray-100 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product, batch or DI number…"
            className={`${field} w-full pl-9`}
          />
        </div>

        <select value={taskFilter.plant} onChange={(e) => setTaskFilter((f) => ({ ...f, plant: e.target.value }))} className={`${field} cursor-pointer`}>
          <option value="">All plants</option>
          {PLANT_KEYS.map((p) => <option key={p}>{p}</option>)}
        </select>

        <input type="date" value={taskFilter.date} onChange={(e) => setTaskFilter((f) => ({ ...f, date: e.target.value }))} className={`${field} cursor-pointer`} />

        <div className="inline-flex rounded-lg bg-gray-100 p-0.5">
          {STATUS_MODES.map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => setStatusMode(mode)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                statusMode === mode ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {hasFilters && (
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-gray-700">
            <X size={13} /> Clear
          </button>
        )}
      </div>

      {/* Count strip */}
      {!loading && (
        <div className="px-5 py-2 bg-gray-50/70 border-b border-gray-100 text-[11px] text-gray-500 flex gap-4">
          <span><b className="text-gray-700">{taskCount}</b> to issue</span>
          <span><b className="text-amber-600">{sessionCount}</b> in progress</span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="py-14 text-center text-gray-400">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading tasks…
        </div>
      ) : items.length === 0 ? (
        <div className="px-5 py-14 text-center">
          <ClipboardList size={26} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">
            {hasFilters ? 'No tasks match your search or filters' : 'No active tasks'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {hasFilters ? 'Try clearing the filters.' : 'Tasks must be sent from the Planning page first.'}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 max-h-[460px] overflow-y-auto">
          {items.map((it) => {
            const isSession = it.kind === 'session'
            return (
              <div
                key={it.key}
                role={isSession ? undefined : 'button'}
                onClick={isSession ? undefined : () => !checking && onSelectTask(it.raw)}
                className={`px-5 py-3 flex items-start gap-3 transition-colors ${
                  isSession
                    ? 'bg-amber-50/50'
                    : `cursor-pointer hover:bg-blue-50/60 ${checking ? 'opacity-50 pointer-events-none' : ''}`
                }`}
              >
                <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
                  isSession ? 'bg-amber-100 text-amber-700' : (PLANT_BADGE[it.plant] || 'bg-gray-100 text-gray-600 border border-gray-200')
                }`}>
                  <FlaskConical size={16} />
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-gray-900 text-sm truncate">{toTitleCase(it.productName)}</div>
                    {isSession ? (
                      <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">Pending</span>
                    ) : (
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadgeCls(it.status)}`}>{it.status}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-x-3 gap-y-1 mt-1 flex-wrap text-xs text-gray-400">
                    {it.plant && <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PLANT_BADGE[it.plant] || 'bg-gray-100 text-gray-600'}`}>{it.plant}</span>}
                    {it.date && <span>{it.date}</span>}
                    {it.qty != null && <span className="font-medium text-gray-600">{it.qty} {it.qtyUom || 'KG'}</span>}
                    {it.batchCode && <span className="font-mono">{it.batchCode}</span>}
                    {it.diNo && <span>{it.diNo}</span>}
                    {isSession && (
                      <span className="text-amber-600">
                        {it.microbeCount} microbe{it.microbeCount !== 1 ? 's' : ''} · saved {fmtDate(it.savedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {isSession && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onResumeSession(it.raw) }}
                    className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-2.5 py-1.5"
                  >
                    <PlayCircle size={13} /> Resume
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
