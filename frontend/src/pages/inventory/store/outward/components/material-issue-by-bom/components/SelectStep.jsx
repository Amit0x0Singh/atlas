import { useState } from 'react'
import { Loader2, ClipboardList, FlaskConical, X, Search, RotateCcw, ListChecks, ArrowRight, SlidersHorizontal, Clock } from 'lucide-react'
import { Button, IconButton, BottomSheet, Modal } from '../../../../../../../components/ui'
import { PLANT_BADGE, statusBadgeCls } from '../../../../../../production/planning/data/plantConfig.js'

import { toTitleCase } from '../../../../../../../utils/textDisplay.js'

const STATUS_TABS = [
  { value: 'all',         label: 'All' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'to-start',    label: 'To Start' },
]

const PLANTS = ['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules']

// "29 Aug, 02:20 PM" — from an ISO timestamp. Returns '' for empty / a bare
// date string unchanged when it can't be parsed to a real instant.
function fmtWhen(v) {
  if (!v) return ''
  const d = new Date(v)
  if (isNaN(d.getTime())) return String(v)
  return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// ─── Section heading ─────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, count, tone }) {
  const tones = {
    amber: { chip: 'bg-amber-100 text-amber-700', icon: 'bg-amber-100 text-amber-600' },
    slate: { chip: 'bg-slate-100 text-slate-600', icon: 'bg-slate-100 text-slate-500' },
  }
  const t = tones[tone] || tones.slate
  return (
    <div className="flex items-center gap-2 mb-2.5">
      <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${t.icon}`}>
        <Icon size={15} />
      </span>
      <h3 className="text-sm font-bold text-gray-900">{title}</h3>
      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${t.chip}`}>{count}</span>
    </div>
  )
}

// ─── Resume-session card ─────────────────────────────────────────────────────
function SessionCard({ s, onResume }) {
  const pct = s._total > 0 ? Math.round((s._done / s._total) * 100) : 0
  return (
    <button
      type="button"
      onClick={() => onResume(s)}
      className="group w-full text-left rounded-xl border border-amber-200/80 bg-white shadow-sm hover:shadow-md hover:border-amber-300 transition-all overflow-hidden"
    >
      <div className="flex items-stretch">
        <span className="w-1.5 shrink-0 bg-amber-400" />

        <div className="flex-1 min-w-0 py-2.5 px-3 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate min-w-0">{toTitleCase(s.productName)}</p>
              {s._plant && <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${PLANT_BADGE[s._plant] || 'bg-gray-100 text-gray-600'}`}>{s._plant}</span>}
            </div>
            <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-700">
              {s._done > 0 ? 'In Progress' : 'Started'}
            </span>
          </div>

          {/* one compact wrapping meta line */}
          <div className="flex items-center gap-x-2 gap-y-0.5 mt-1 flex-wrap text-[11px] text-gray-400">
            {s.startedAt && <span className="inline-flex items-center gap-1"><Clock size={11} />{fmtWhen(s.startedAt)}</span>}
            <span className="font-semibold text-gray-600">{s.batchQty} {(s.batchUom || 'KG').toUpperCase()}</span>
            {s.batchRef && <span className="font-mono">{s.batchRef}</span>}
            {s._total > 0 && <span className="font-bold text-amber-700">{s._done}/{s._total} issued</span>}
          </div>

          {/* desktop: progress bar */}
          {s._total > 0 && (
            <div className="hidden md:block mt-2.5">
              <div className="flex items-center justify-between text-[11px] font-semibold text-amber-700 mb-1">
                <span>{s._done}/{s._total} materials issued</span>
                <span>{pct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-amber-100 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:flex items-center pr-4">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 group-hover:bg-violet-700 text-white text-[12px] font-bold px-3.5 py-2 transition-colors">
            Resume <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>
  )
}

// ─── To-start task card ──────────────────────────────────────────────────────
function TaskCard({ task, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className={`w-full text-left rounded-xl border p-3 md:p-4 transition-all shadow-sm hover:shadow-md ${
        selected
          ? 'border-indigo-400 bg-indigo-50/70 ring-1 ring-indigo-200'
          : 'border-gray-200 bg-white hover:border-indigo-300'
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`hidden md:flex shrink-0 w-9 h-9 rounded-xl items-center justify-center ${PLANT_BADGE[task.plant] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
          <FlaskConical size={16} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <p className="font-semibold text-gray-900 text-sm truncate min-w-0">{toTitleCase(task.productName)}</p>
              <span className={`shrink-0 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${PLANT_BADGE[task.plant] || 'bg-gray-100 text-gray-600'}`}>{task.plant}</span>
            </div>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadgeCls(task.status)}`}>{task.status}</span>
          </div>

          <div className="flex items-center gap-x-2 gap-y-0.5 mt-1.5 flex-wrap text-[11px] text-gray-400">
            <span>{task.date}</span>
            <span className="font-semibold text-gray-600">{task.qty} {task.qtyUom || 'KG'}</span>
            {task.batchCode && <span className="font-mono">{task.batchCode}</span>}
            {task.diNo && <span>{task.diNo}</span>}
          </div>

          <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-400">
            <Clock size={11} />
            Planned {fmtWhen(task.createdAt) || task.date}
            {task.shift && task.shift !== 'General' && <span>· {task.shift}</span>}
          </p>
        </div>
      </div>
    </button>
  )
}

// ─── Status segmented control (shared by desktop toolbar + mobile sheet) ──────
function StatusTabs({ value, onChange, filteredTasks, sessions, totalCount, full }) {
  return (
    <div className={`inline-flex rounded-xl border border-gray-200 bg-gray-50 p-0.5 ${full ? 'w-full' : ''}`}>
      {STATUS_TABS.map(t => {
        const active = value === t.value
        const n = t.value === 'to-start' ? filteredTasks.length : t.value === 'in-progress' ? sessions.length : totalCount
        return (
          <button key={t.value} type="button"
            onClick={() => onChange(t.value)}
            className={[
              'text-[12px] font-semibold px-3 py-1.5 rounded-lg transition-colors',
              full ? 'flex-1 text-center' : '',
              active ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}>
            {t.label}<span className={active ? 'text-indigo-400' : 'text-gray-400'}> {n}</span>
          </button>
        )
      })}
    </div>
  )
}

const SELECT_CLS = 'border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-400 transition-colors'

export default function SelectStep({
  error, isMobile,
  selProduct, batchQty, batchUom, batchRef, diNo, selTaskId,
  taskFilter, setTaskFilter, filteredTasks, sessions = [], onResumeSession, loadingTasks,
  loadingBom, onSelectTask, onLoadBom, onClearSelection,
}) {
  const [filterSheet, setFilterSheet] = useState(false)

  const totalCount = filteredTasks.length + sessions.length
  const hasActiveFilter = taskFilter.q || taskFilter.plant || taskFilter.date || taskFilter.status !== 'all'
  const mobileFilterCount =
    (taskFilter.plant ? 1 : 0) + (taskFilter.date ? 1 : 0) + (taskFilter.status !== 'all' ? 1 : 0)

  const resetFilters = () => setTaskFilter({ plant: '', date: '', q: '', status: 'all' })

  const taskDetailBody = (
    <>
      <dl className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-400">Batch Qty</dt>
          <dd className="font-semibold text-gray-800">{batchQty || '—'} {batchUom?.toUpperCase()}</dd>
        </div>
        {batchRef && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-400">Batch Ref</dt>
            <dd className="font-mono text-xs text-gray-700 truncate max-w-[170px]">{batchRef}</dd>
          </div>
        )}
        {diNo && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-400">DI No.</dt>
            <dd className="text-gray-700">{diNo}</dd>
          </div>
        )}
      </dl>

      <Button onClick={onLoadBom}
        disabled={loadingBom || !selProduct || !batchQty || parseFloat(batchQty) <= 0}
        loading={loadingBom}
        variant="purple"
        fullWidth>
        {loadingBom ? 'Loading BOM…' : 'Load BOM & Start Issuing'}
      </Button>
    </>
  )

  const detailHeader = (
    <div className="bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-4 text-white">
      <div className="flex items-start gap-2.5">
        <span className="shrink-0 w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
          <FlaskConical size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-white/70 uppercase tracking-wide">Selected Task</p>
          <p className="text-sm font-bold truncate">{toTitleCase(selProduct?.productName)}</p>
        </div>
        <IconButton icon={X} onClick={onClearSelection} variant="ghost" size="xs" tooltip="Clear selection"
          className="ml-auto flex-shrink-0 !text-white hover:!bg-white/20" />
      </div>
    </div>
  )

  return (
    <div className="p-4 md:p-6">

      <p className="text-sm text-gray-500 mb-4">
        Pick a task to issue raw materials by BOM. Progress auto-saves — leave and resume any time.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">{error}</div>
      )}

      <div className="min-w-0">

          {/* Filter card */}
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 mb-5">
            <div className="flex items-center gap-2">
              <div className="relative flex-1 min-w-0">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  value={taskFilter.q}
                  onChange={e => setTaskFilter(f => ({ ...f, q: e.target.value }))}
                  placeholder="Search product, batch, DI…"
                  className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-400 transition-colors"
                />
              </div>

              {/* mobile: single Filter button → opens sheet */}
              <button type="button" onClick={() => setFilterSheet(true)}
                className="md:hidden relative inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm font-semibold text-gray-600">
                <SlidersHorizontal size={15} />
                Filter
                {mobileFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {mobileFilterCount}
                  </span>
                )}
              </button>

              {/* desktop: inline plant + date */}
              <div className="hidden md:flex gap-2">
                <select value={taskFilter.plant} onChange={e => setTaskFilter(f => ({ ...f, plant: e.target.value }))} className={SELECT_CLS}>
                  <option value="">All Plants</option>
                  {PLANTS.map(p => <option key={p}>{p}</option>)}
                </select>
                <input type="date" value={taskFilter.date} onChange={e => setTaskFilter(f => ({ ...f, date: e.target.value }))} className={SELECT_CLS} />
              </div>
            </div>

            {/* desktop: status tabs + clear + count */}
            <div className="hidden md:flex items-center gap-2 mt-2.5 flex-wrap">
              <StatusTabs
                value={taskFilter.status}
                onChange={v => setTaskFilter(f => ({ ...f, status: v }))}
                filteredTasks={filteredTasks} sessions={sessions} totalCount={totalCount}
              />
              {hasActiveFilter && (
                <button type="button" onClick={resetFilters}
                  className="text-[12px] font-semibold text-indigo-600 hover:underline px-1.5 py-1.5">
                  Clear filters
                </button>
              )}
              {!loadingTasks && (
                <span className="text-xs text-gray-400 ml-auto">{totalCount} item{totalCount !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>

          {loadingTasks ? (
            <div className="py-16 text-center text-gray-400">
              <Loader2 size={24} className="animate-spin mx-auto mb-2" />
              Loading tasks…
            </div>
          ) : totalCount === 0 ? (
            <div className="bg-white border border-dashed border-gray-300 rounded-2xl px-4 py-14 text-center">
              <ClipboardList size={28} className="mx-auto mb-3 text-gray-300" />
              <p className="text-sm text-gray-600 font-semibold">
                {hasActiveFilter ? 'Nothing matches your filters' : 'No tasks ready to issue'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {hasActiveFilter ? 'Try clearing the search or filters' : 'Tasks must be sent from the Planning page first'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">

              {/* Resume — always first */}
              {sessions.length > 0 && (
                <section>
                  <SectionHeader icon={RotateCcw} title="Resume in progress" count={sessions.length} tone="amber" />
                  <div className="grid gap-2.5 2xl:grid-cols-2">
                    {sessions.map(s => <SessionCard key={s.id} s={s} onResume={onResumeSession} />)}
                  </div>
                </section>
              )}

              {/* To start */}
              {filteredTasks.length > 0 && (
                <section>
                  <SectionHeader icon={ListChecks} title="Ready to start" count={filteredTasks.length} tone="slate" />
                  <div className="grid gap-2.5 lg:grid-cols-2 2xl:grid-cols-3">
                    {filteredTasks.map(task => (
                      <TaskCard key={task.id} task={task} selected={selTaskId === task.id} onSelect={onSelectTask} />
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
      </div>

      {/* ── Selected-task detail — centered popup on desktop, bottom-sheet on
          mobile. ONLY for a "Ready to start" task (selTaskId set): it's the
          "Load BOM & Start Issuing" step. Resume-session cards skip this
          entirely and jump straight to the checklist — showing it there would
          let the operator start a second, duplicate session. ── */}
      {!isMobile && (
        <Modal open={!!selProduct && !!selTaskId} onClose={onClearSelection} size="sm" showCloseButton={false}>
          {detailHeader}
          <div className="p-5">{taskDetailBody}</div>
        </Modal>
      )}

      {isMobile && (
        <BottomSheet open={!!selProduct && !!selTaskId} onClose={onClearSelection} title={toTitleCase(selProduct?.productName) || 'Selected Task'}>
          <div className="p-4">{taskDetailBody}</div>
        </BottomSheet>
      )}

      {/* ── Mobile: filters popup ─────────────────────────────────────────── */}
      {isMobile && (
        <BottomSheet open={filterSheet} onClose={() => setFilterSheet(false)} title="Filter tasks">
          <div className="p-4 space-y-5">
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-2">Status</label>
              <StatusTabs
                value={taskFilter.status}
                onChange={v => setTaskFilter(f => ({ ...f, status: v }))}
                filteredTasks={filteredTasks} sessions={sessions} totalCount={totalCount}
                full
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-2">Plant</label>
              <select value={taskFilter.plant} onChange={e => setTaskFilter(f => ({ ...f, plant: e.target.value }))} className={`${SELECT_CLS} w-full`}>
                <option value="">All Plants</option>
                {PLANTS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-2">Date</label>
              <input type="date" value={taskFilter.date} onChange={e => setTaskFilter(f => ({ ...f, date: e.target.value }))} className={`${SELECT_CLS} w-full`} />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline-gray" fullWidth onClick={resetFilters}>Clear all</Button>
              <Button variant="purple" fullWidth onClick={() => setFilterSheet(false)}>
                Show {totalCount} result{totalCount !== 1 ? 's' : ''}
              </Button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
