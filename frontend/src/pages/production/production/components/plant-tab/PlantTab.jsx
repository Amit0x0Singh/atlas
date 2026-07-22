import { useState } from 'react'
import { PLANT_CONFIG } from '../../../planning/data/plantConfig.js'
import { todayISO, addDays, fmtDateLabel } from '../../../planning/utils/date.js'
import { Button } from '../../../../../components/ui'
import TaskCard from '../task-card/TaskCard.jsx'

export default function PlantTab({ plant, tasks, onEdit, onStatusUpdate, onBMR }) {
  const cfg = PLANT_CONFIG[plant]
  const [date,         setDate]         = useState(todayISO())
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = tasks.filter(t => {
    if (t.plant !== plant || t.date !== date || !t.sent) return false
    const q = search.toLowerCase()
    if (q && !t.productName.toLowerCase().includes(q) && !(t.taskId || '').toLowerCase().includes(q)) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-full text-[12px] font-bold text-white" style={{ background: cfg.color }}>
            {cfg.label}
          </span>
          <span className="text-[13px] text-gray-400">{fmtDateLabel(date)}</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline-gray" size="sm" onClick={() => setDate(addDays(todayISO(), -1))}>← Yesterday</Button>
          <Button variant="primary" size="sm" onClick={() => setDate(todayISO())}>Today</Button>
          <Button variant="outline-gray" size="sm" onClick={() => setDate(addDays(todayISO(), 1))}>Tomorrow →</Button>
        </div>
      </div>

      <div className="flex gap-2.5 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product, task ID..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 bg-white">
          <option value="">All Statuses</option>
          {(cfg.statuses || []).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-2">🏭</div>
          <div className="font-medium text-gray-500">No tasks for this plant on this date</div>
          <div className="text-[12px] mt-1">Ensure the schedule has been sent from the Planning page</div>
        </div>
      ) : (
        <div className="prodp-task-grid grid gap-3.5">
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onBMR={onBMR} />
          ))}
        </div>
      )}
    </div>
  )
}
