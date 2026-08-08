import { useState } from 'react'
import { todayISO, addDays, fmtDateLabel } from '../../utils/date.js'
import { Button } from '../../../../../components/ui'
import { Plus, Send, Pencil, Trash2 } from 'lucide-react'
import { planTasksApi } from '../../../../../api/production.js'
import StatusBadge from '../ui/status-badge/StatusBadge.jsx'
import PlantBadge from '../ui/plant-badge/PlantBadge.jsx'

import { toTitleCase } from '../../../../../utils/textDisplay.js'
export default function PlanningTab({ tasks, onRefresh, onAdd, onEdit, onDelete, toastShow }) {
  const [planDate,   setPlanDate]   = useState(todayISO())
  const [dateOffset, setDateOffset] = useState(0)
  const [sending,    setSending]    = useState(false)

  function setOffset(n) {
    setDateOffset(n)
    setPlanDate(addDays(todayISO(), n))
  }

  const filtered = tasks.filter(t => t.date === planDate)

  async function sendSchedule() {
    const unsent = filtered.filter(t => !t.sent)
    if (!unsent.length) { toastShow('No unsent tasks for this date', 'err'); return }
    setSending(true)
    try {
      await planTasksApi.sendSchedule(planDate)
      onRefresh()
      toastShow(`✓ Schedule sent — ${unsent.length} task(s) pushed to plant pages`, 'ok')
    } catch (e) {
      toastShow(e.message, 'err')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6">
      <div className="pp-schedule-banner rounded-xl p-4 mb-5 flex items-center justify-between text-white">
        <div>
          <div className="font-bold text-[14px] mb-0.5">📅 Production Schedule</div>
          <div className="text-[13px] opacity-80">
            Plan tasks for any date, then <b className="opacity-100">Send Schedule</b> to push to plant dashboards.
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <input type="date" value={planDate} onChange={e => { setPlanDate(e.target.value); setDateOffset(null) }}
            className="px-3 py-2 rounded-lg text-[13px] text-gray-800 border-0 focus:outline-none" />
          <Button variant="warning" icon={Plus} size="sm" onClick={() => onAdd(planDate)}>Add Task</Button>
          <Button variant="success" icon={Send} size="sm" onClick={sendSchedule} loading={sending}>Send Schedule</Button>
        </div>
      </div>

      <div className="flex items-center gap-2.5 mb-4">
        {[[-1, 'Yesterday'], [0, 'Today'], [1, 'Tomorrow'], [2, 'Day After']].map(([n, label]) => (
          <button key={n} onClick={() => setOffset(n)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition
              ${dateOffset === n ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500 bg-white'}`}>
            {label}
          </button>
        ))}
        <span className="text-[12px] text-gray-400 ml-2">{fmtDateLabel(planDate)}</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 font-bold text-[13px] text-white flex items-center justify-between bg-[#374151]">
          <span>📋 Tasks for {fmtDateLabel(planDate)}</span>
          <span className="text-[12px] opacity-70">{filtered.length} task(s)</span>
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-medium text-gray-500">No tasks for this date</div>
            <div className="text-[12px] mt-1">Click "+ Add Task" to plan</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Task ID', 'Plant', 'Product', 'DI No', 'Batch Code', 'Qty', 'Process', 'Incharge', 'Shift', 'Status', 'Sent', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-left border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i % 2 ? 'bg-gray-50/30' : ''}`}>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] font-bold text-indigo-700">{t.taskId}</td>
                    <td className="px-3 py-2.5"><PlantBadge plant={t.plant} /></td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[140px] truncate">{toTitleCase(t.productName)}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11.5px]">{t.diNo || '—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 max-w-[150px] truncate">{t.batchCode || '—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-700">{t.qty} <span className="text-[10px] text-gray-400 font-normal">{t.qtyUom || ''}</span></td>
                    <td className="px-3 py-2.5 text-gray-600">{t.process || '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{t.incharge || '—'}</td>
                    <td className="px-3 py-2.5"><span className="bg-gray-100 text-gray-600 text-[10.5px] font-semibold px-2 py-0.5 rounded-full">{t.shift || 'G'}</span></td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status || 'Not Started'} /></td>
                    <td className="px-3 py-2.5">
                      {t.sent
                        ? <span className="text-[10.5px] font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">✓ Sent</span>
                        : <span className="text-[10.5px] font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">Draft</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <Button variant="secondary" size="xs" icon={Pencil} onClick={() => onEdit(t)}>Edit</Button>
                        <Button variant="danger" size="xs" icon={Trash2} onClick={() => onDelete(t)}>Del</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
