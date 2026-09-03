import { useMemo, useState } from 'react'
import { PLANT_CONFIG, PLANT_KEYS } from '../../data/plantConfig.js'
import { todayISO, fmtDateLabel } from '../../utils/date.js'
import { Button } from '../../../../../components/ui'
import StatusBadge from '../ui/status-badge/StatusBadge.jsx'
import PlantBadge from '../ui/plant-badge/PlantBadge.jsx'

import { toTitleCase } from '../../../../../utils/textDisplay.js'

// Dashboard used to only ever show tasks dated exactly today, which hid every
// batch planned for another day (or one that slipped past its planned date but
// was never marked complete). These ranges let the planner see and update the
// status of all of them.
const RANGES = [
  { id: 'today',    label: 'Today' },
  { id: 'overdue',  label: 'Overdue' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'all',      label: 'All pending' },
]

export default function DashboardTab({ tasks, onStatusUpdate }) {
  const today = todayISO()
  const [range, setRange] = useState('all')

  // "Pending" = sent to a plant and not yet completed — the set a planner can
  // still act on. Everything below filters this down by planned date.
  const pending = useMemo(
    () => tasks.filter(t => t.sent && t.status !== 'Completed'),
    [tasks],
  )

  const counts = useMemo(() => ({
    today:    pending.filter(t => t.date === today).length,
    overdue:  pending.filter(t => t.date && t.date < today).length,
    upcoming: pending.filter(t => t.date && t.date > today).length,
    all:      pending.length,
  }), [pending, today])

  const visible = useMemo(() => {
    const byRange = pending.filter(t => {
      if (range === 'today')    return t.date === today
      if (range === 'overdue')  return t.date && t.date < today
      if (range === 'upcoming') return t.date && t.date > today
      return true
    })
    // Overdue first, then soonest planned date first.
    return [...byRange].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  }, [pending, range, today])

  return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-3.5 mb-4">
        {PLANT_KEYS.map(plant => {
          const cfg   = PLANT_CONFIG[plant]
          const count = visible.filter(t => t.plant === plant).length
          return (
            <div key={plant} className="bg-white rounded-xl p-4 shadow-sm" style={{ borderTop: `4px solid ${cfg.color}` }}>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{plant}</div>
              <div className="text-[22px] font-bold text-gray-900">{count}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">
                {range === 'today' ? 'active tasks today' : 'tasks in view'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Range filter */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {RANGES.map(r => {
          const active = range === r.id
          const alarm  = r.id === 'overdue' && counts.overdue > 0
          const pillCls = active
            ? 'bg-white/20 text-white'
            : alarm ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRange(r.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-semibold border transition
                ${active
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-300'}`}
            >
              {r.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pillCls}`}>
                {counts[r.id]}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-gray-500">
            {range === 'today' ? 'No active tasks for today' : 'No tasks in this view'}
          </div>
          <div className="text-[12px] mt-1">Go to Planning tab → create tasks → Send Schedule</div>
        </div>
      ) : (
        <div className="pp-task-grid grid gap-3.5">
          {visible.map(t => {
            const isOverdue = t.date && t.date < today
            return (
              <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden"
                style={{ borderLeft: `5px solid ${PLANT_CONFIG[t.plant]?.color || '#64748b'}` }}>
                <div className="px-4 py-3 flex items-start justify-between">
                  <div>
                    <div className="font-mono text-[11px] text-gray-400 mb-0.5">{t.taskId}</div>
                    <div className="font-bold text-[14px]">{toTitleCase(t.productName)}</div>
                  </div>
                  <StatusBadge status={t.status || 'Not Started'} />
                </div>
                <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
                  <span className={isOverdue ? 'text-red-600 font-semibold' : ''}>
                    {isOverdue ? 'Overdue: ' : 'Planned: '}
                    <b className={isOverdue ? 'text-red-600' : 'text-gray-800'}>{fmtDateLabel(t.date)}</b>
                  </span>
                  <span>Qty: <b className="text-gray-800">{t.qty} {t.qtyUom || ''}</b></span>
                  <span>Process: <b className="text-gray-800">{t.process}</b></span>
                  <span>Incharge: <b className="text-gray-800">{t.incharge}</b></span>
                </div>
                <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                  <PlantBadge plant={t.plant} />
                  <Button variant="primary" size="xs" onClick={() => onStatusUpdate(t)}>
                    Update Status
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
