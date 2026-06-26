import { useState, useEffect, useRef } from 'react'
import AddTaskDrawer from '../components/AddTaskDrawer.jsx'
import BMROverlay from '../components/BMROverlay.jsx'
import SFGStockModal from '../components/SFGStockModal.jsx'
import {
  PLANT_CONFIG, PLANT_KEYS, TAB_TO_PLANT,
  SK, lsLoad, lsSave,
  todayISO, addDays, fmtDateLabel,
  statusBadgeCls, PLANT_BADGE,
} from '../planningConstants.js'

// ── Toast ─────────────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState(null)
  function show(msg, type='ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

function Toast({ toast }) {
  if (!toast) return null
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] px-5 py-3 rounded-xl text-[13px] font-semibold text-white shadow-xl
      ${toast.type==='err' ? 'bg-red-600' : 'bg-gray-900'}`}>
      {toast.msg}
    </div>
  )
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${statusBadgeCls(status)}`}>
      {status||'—'}
    </span>
  )
}

// ── Plant Badge ───────────────────────────────────────────────────────────────
function PlantBadge({ plant }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-bold whitespace-nowrap ${PLANT_BADGE[plant]||'bg-gray-100 text-gray-600'}`}>
      {plant}
    </span>
  )
}

// ── Task Card (used in plant pages) ──────────────────────────────────────────
function TaskCard({ task, plant, onEdit, onStatusUpdate, onBMR }) {
  const cfg   = PLANT_CONFIG[plant] || {}
  const color = cfg.color || '#64748b'
  const [elapsed, setElapsed] = useState('')

  useEffect(() => {
    if (plant !== 'Botanical' || !task.timerStart || task.status === 'Completed') return
    const iv = setInterval(() => {
      const diff = (Date.now() - new Date(task.timerStart)) / 1000
      const h = Math.floor(diff/3600), m = Math.floor((diff%3600)/60), s = Math.floor(diff%60)
      setElapsed(`⏱ ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`)
    }, 1000)
    return () => clearInterval(iv)
  }, [task.timerStart, task.status, plant])

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{borderLeft:`5px solid ${color}`}}>
      <div className="px-4 py-3 flex items-start justify-between">
        <div>
          <div className="font-mono text-[11px] text-gray-400 mb-0.5">{task.taskId}</div>
          <div className="font-bold text-[14px] text-gray-900">{task.productName}</div>
        </div>
        <StatusBadge status={task.status||'Not Started'} />
      </div>
      <div className="px-4 pb-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
          <span>DI: <b className="text-gray-800">{task.diNo||'—'}</b></span>
          <span>Batch: <b className="text-gray-800 font-mono text-[11px]">{task.batchCode||'—'}</b></span>
          <span>Qty: <b className="text-gray-800">{task.qty} {task.qtyUom||''}</b></span>
          <span>Process: <b className="text-gray-800">{task.process||'—'}</b></span>
          <span>Incharge: <b className="text-gray-800">{task.incharge||'—'}</b></span>
          <span>Shift: <b className="text-gray-800">{task.shift||'G'}</b></span>
          {task.equipment && <span>Equip: <b className="text-gray-800">{task.equipment}</b></span>}
          {task.carrier   && <span>Carrier: <b className="text-gray-800">{task.carrier}</b></span>}
          {task.specs     && <span>Specs: <b className="text-gray-800">{task.specs}</b></span>}
          {task.location  && <span>Location: <b className="text-gray-800">{task.location}</b></span>}
          {task.primaryPack && <span>Primary: <b className="text-gray-800">{task.primaryPack}</b></span>}
          {task.noUnits   && <span>Units: <b className="text-gray-800">{task.noUnits}</b></span>}
        </div>
        {task.remarks && (
          <div className="mt-2 text-[11.5px] text-gray-500 bg-gray-50 px-3 py-1.5 rounded-lg border-l-2 border-gray-200">
            📝 {task.remarks.slice(0,80)}
          </div>
        )}
        {elapsed && <div className="mt-2 font-mono text-[12px] font-bold text-amber-500">{elapsed}</div>}
      </div>
      <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] text-gray-400">{fmtDateLabel(task.date)}</span>
        <div className="flex gap-1.5">
          <button onClick={() => onEdit(task)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-gray-100 hover:bg-gray-200 transition">Edit</button>
          <button onClick={() => onBMR(task.id)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded text-white transition"
            style={{background:'#7c3aed'}}>📋 BMR</button>
          <button onClick={() => onStatusUpdate(task)}
            className="px-2.5 py-1 text-[11px] font-semibold rounded bg-blue-600 text-white hover:bg-blue-700 transition">Status</button>
        </div>
      </div>
    </div>
  )
}

// ── Status Update Drawer ──────────────────────────────────────────────────────
function StatusDrawer({ task, onSave, onClose }) {
  const cfg = PLANT_CONFIG[task.plant] || {}
  const [status,  setStatus]  = useState(task.status  || 'Not Started')
  const [remarks, setRemarks] = useState(task.remarks || '')

  function handleSave() {
    const tasks = lsLoad(SK.tasks)
    const idx   = tasks.findIndex(t => t.id === task.id)
    if (idx < 0) return
    const prev = tasks[idx].status
    tasks[idx].status    = status
    tasks[idx].remarks   = remarks
    tasks[idx].updatedAt = new Date().toISOString()
    if (task.plant === 'Botanical') {
      if (prev === 'Not Started' && status !== 'Not Started' && !tasks[idx].timerStart)
        tasks[idx].timerStart = new Date().toISOString()
      if (status === 'Completed' && !tasks[idx].timerEnd)
        tasks[idx].timerEnd = new Date().toISOString()
    }
    lsSave(SK.tasks, tasks)
    onSave()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose}/>
      <div className="w-full max-w-sm bg-white flex flex-col h-full shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0 bg-white z-10">
          <span className="font-bold text-[14px]">Update Status</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-gray-50 rounded-lg p-4 mb-4 text-[13px]">
            <div className="text-[11px] text-gray-400 mb-1">Task: <span className="font-mono font-bold text-gray-700">{task.taskId}</span></div>
            <div className="font-bold text-gray-900">{task.productName}</div>
            <div className="text-gray-500 mt-0.5">{task.process} — {task.qty} {task.qtyUom||''}</div>
            <div className="mt-2">Current: <StatusBadge status={task.status||'Not Started'}/></div>
          </div>
          <div className="mb-4">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">New Status *</label>
            <select value={status} onChange={e => setStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400">
              {(cfg.statuses||[]).map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1.5">Remarks / Notes</label>
            <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-[13px] resize-vertical focus:outline-none focus:border-blue-400"/>
          </div>
        </div>
        <div className="px-5 py-4 border-t flex gap-2.5 justify-end sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-semibold hover:bg-gray-50">Cancel</button>
          <button onClick={handleSave} className="px-5 py-2 bg-green-600 text-white rounded-lg text-[13px] font-bold hover:bg-green-700">Update Status</button>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Tab ─────────────────────────────────────────────────────────────
function DashboardTab({ tasks, onStatusUpdate }) {
  const today = todayISO()
  const todayTasks = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed')

  return (
    <div className="p-6">
      {/* Stat cards */}
      <div className="grid grid-cols-5 gap-3.5 mb-6">
        {PLANT_KEYS.map(plant => {
          const cfg   = PLANT_CONFIG[plant]
          const count = todayTasks.filter(t => t.plant === plant).length
          return (
            <div key={plant} className="bg-white rounded-xl p-4 shadow-sm" style={{borderTop:`4px solid ${cfg.color}`}}>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{plant}</div>
              <div className="text-[22px] font-bold text-gray-900">{count}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">active tasks today</div>
            </div>
          )
        })}
      </div>

      {todayTasks.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-gray-500">No active tasks for today</div>
          <div className="text-[12px] mt-1">Go to Planning → create tasks → Send Schedule</div>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))'}}>
          {todayTasks.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{borderLeft:`5px solid ${PLANT_CONFIG[t.plant]?.color||'#64748b'}`}}>
              <div className="px-4 py-3 flex items-start justify-between">
                <div>
                  <div className="font-mono text-[11px] text-gray-400 mb-0.5">{t.taskId}</div>
                  <div className="font-bold text-[14px]">{t.productName}</div>
                </div>
                <StatusBadge status={t.status||'Not Started'}/>
              </div>
              <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
                <span>Plant: <b className="text-gray-800">{t.plant}</b></span>
                <span>Qty: <b className="text-gray-800">{t.qty} {t.qtyUom||''}</b></span>
                <span>Process: <b className="text-gray-800">{t.process}</b></span>
                <span>Incharge: <b className="text-gray-800">{t.incharge}</b></span>
              </div>
              <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                <PlantBadge plant={t.plant}/>
                <button onClick={() => onStatusUpdate(t)}
                  className="px-3 py-1 bg-blue-600 text-white text-[11px] font-semibold rounded hover:bg-blue-700 transition">
                  Update Status
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Planning Tab ──────────────────────────────────────────────────────────────
function PlanningTab({ tasks, onChange, onAdd, onEdit, toastShow }) {
  const [planDate,    setPlanDate]    = useState(todayISO())
  const [dateOffset,  setDateOffset]  = useState(0)

  function setOffset(n) {
    setDateOffset(n)
    setPlanDate(addDays(todayISO(), n))
  }

  const filtered = tasks.filter(t => t.date === planDate)

  function sendSchedule() {
    const unsent = filtered.filter(t => !t.sent)
    if (!unsent.length) { toastShow('No unsent tasks for this date', 'err'); return }
    const all = lsLoad(SK.tasks)
    let count = 0
    all.forEach(t => { if (t.date === planDate && !t.sent) { t.sent = true; count++ } })
    lsSave(SK.tasks, all)
    onChange()
    const byPlant = {}
    unsent.forEach(t => { byPlant[t.plant] = (byPlant[t.plant]||0)+1 })
    toastShow(`✓ Schedule sent — ${count} task(s) pushed to plant pages`, 'ok')
  }

  function deleteTask(id) {
    if (!confirm('Delete this task?')) return
    lsSave(SK.tasks, lsLoad(SK.tasks).filter(t => t.id !== id))
    onChange()
  }

  return (
    <div className="p-6">
      <div className="rounded-xl p-4 mb-5 flex items-center justify-between text-white"
        style={{background:'linear-gradient(135deg,#0f1923 0%,#2d3a47 100%)'}}>
        <div>
          <div className="font-bold text-[14px] mb-0.5">📅 Production Schedule</div>
          <div className="text-[13px] opacity-80">
            Plan tasks for any date, then <b className="opacity-100">Send Schedule</b> to push to plant dashboards.
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <input type="date" value={planDate} onChange={e => { setPlanDate(e.target.value); setDateOffset(null) }}
            className="px-3 py-2 rounded-lg text-[13px] text-gray-800 border-0 focus:outline-none"/>
          <button onClick={onAdd}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-[13px] font-semibold transition">
            + Add Task
          </button>
          <button onClick={sendSchedule}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-semibold transition">
            📤 Send Schedule
          </button>
        </div>
      </div>

      {/* Date strip */}
      <div className="flex items-center gap-2.5 mb-4">
        {[[-1,'Yesterday'],[0,'Today'],[1,'Tomorrow'],[2,'Day After']].map(([n,label]) => (
          <button key={n} onClick={() => setOffset(n)}
            className={`px-4 py-1.5 rounded-lg text-[12px] font-semibold border-[1.5px] transition
              ${dateOffset===n ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-500 bg-white'}`}>
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
                  {['Task ID','Plant','Product','DI No','Batch Code','Qty','Process','Incharge','Shift','Status','Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-left border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t,i) => (
                  <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${i%2?'bg-gray-50/30':''}`}>
                    <td className="px-3 py-2.5 font-mono text-[11.5px] font-bold text-indigo-700">{t.taskId}</td>
                    <td className="px-3 py-2.5"><PlantBadge plant={t.plant}/></td>
                    <td className="px-3 py-2.5 font-semibold text-gray-800 max-w-[140px] truncate">{t.productName}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-[11.5px]">{t.diNo||'—'}</td>
                    <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600 max-w-[150px] truncate">{t.batchCode||'—'}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-700">{t.qty} <span className="text-[10px] text-gray-400 font-normal">{t.qtyUom||''}</span></td>
                    <td className="px-3 py-2.5 text-gray-600">{t.process||'—'}</td>
                    <td className="px-3 py-2.5 text-gray-600">{t.incharge||'—'}</td>
                    <td className="px-3 py-2.5"><span className="bg-gray-100 text-gray-600 text-[10.5px] font-semibold px-2 py-0.5 rounded-full">{t.shift||'G'}</span></td>
                    <td className="px-3 py-2.5"><StatusBadge status={t.status||'Not Started'}/></td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5">
                        <button onClick={() => onEdit(t)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 rounded transition">Edit</button>
                        <button onClick={() => deleteTask(t.id)}
                          className="px-2 py-0.5 text-[11px] font-semibold bg-red-50 text-red-600 hover:bg-red-100 rounded transition">Del</button>
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

// ── Plant Page Tab ─────────────────────────────────────────────────────────────
function PlantTab({ plant, tasks, onEdit, onStatusUpdate, onBMR }) {
  const cfg = PLANT_CONFIG[plant]
  const [date,         setDate]         = useState(todayISO())
  const [search,       setSearch]       = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const filtered = tasks.filter(t => {
    if (t.plant !== plant || t.date !== date || !t.sent) return false
    const q = search.toLowerCase()
    if (q && !t.productName.toLowerCase().includes(q) && !(t.taskId||'').toLowerCase().includes(q)) return false
    if (statusFilter && t.status !== statusFilter) return false
    return true
  })

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="px-4 py-1.5 rounded-full text-[12px] font-bold text-white" style={{background:cfg.color}}>
            {cfg.label}
          </span>
          <span className="text-[13px] text-gray-400">{fmtDateLabel(date)}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setDate(addDays(todayISO(),-1))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] font-semibold text-gray-500 hover:border-gray-300 bg-white transition">← Yesterday</button>
          <button onClick={() => setDate(todayISO())} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[12px] font-semibold hover:bg-blue-700 transition">Today</button>
          <button onClick={() => setDate(addDays(todayISO(),1))} className="px-3 py-1.5 border border-gray-200 rounded-lg text-[12px] font-semibold text-gray-500 hover:border-gray-300 bg-white transition">Tomorrow →</button>
        </div>
      </div>

      <div className="flex gap-2.5 mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product, task ID..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"/>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 bg-white">
          <option value="">All Statuses</option>
          {(cfg.statuses||[]).map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-2">🏭</div>
          <div className="font-medium text-gray-500">No tasks for this plant on this date</div>
          <div className="text-[12px] mt-1">Ensure the schedule has been sent from the Planning tab</div>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))'}}>
          {filtered.map(t => (
            <TaskCard key={t.id} task={t} plant={plant} onEdit={onEdit} onStatusUpdate={onStatusUpdate} onBMR={onBMR}/>
          ))}
        </div>
      )}
    </div>
  )
}

// ── History Tab ───────────────────────────────────────────────────────────────
function HistoryTab({ tasks }) {
  const [search,   setSearch]   = useState('')
  const [plant,    setPlant]    = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')

  const filtered = tasks.filter(t => {
    const q  = search.toLowerCase()
    const mq = !q || t.productName.toLowerCase().includes(q) || (t.taskId||'').toLowerCase().includes(q) || (t.diNo||'').toLowerCase().includes(q)
    const mp = !plant    || t.plant    === plant
    const mf = !fromDate || t.date    >= fromDate
    const mt = !toDate   || t.date    <= toDate
    return mq && mp && mf && mt
  }).sort((a,b) => b.date.localeCompare(a.date))

  function exportCSV() {
    if (!filtered.length) { alert('Nothing to export'); return }
    const hdrs = ['Task ID','Date','Plant','Product','DI No','Batch Code','Qty','Process','Incharge','Shift','Equipment','Carrier','Specs','Status','Remarks','Timer Start','Timer End']
    const rows = filtered.map(t => [
      t.taskId,t.date,t.plant,t.productName,t.diNo||'',t.batchCode||'',
      t.qty,t.process,t.incharge,t.shift||'',t.equipment||'',t.carrier||'',t.specs||'',
      t.status,t.remarks||'',t.timerStart||'',t.timerEnd||''
    ].map(v => `"${String(v||'').replace(/"/g,'""')}"`).join(','))
    const csv = [hdrs.join(','),...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv],{type:'text/csv'}))
    a.download = `schedule_history_${todayISO()}.csv`
    a.click()
  }

  function durStr(t) {
    if (!t.timerStart || !t.timerEnd) return '—'
    const s = (new Date(t.timerEnd) - new Date(t.timerStart)) / 1000
    return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`
  }

  return (
    <div className="p-6">
      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product, task ID, DI number..." style={{minWidth:260}}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"/>
        <select value={plant} onChange={e => setPlant(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-400">
          <option value="">All Plants</option>
          {PLANT_KEYS.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"/>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400"/>
        <button onClick={exportCSV}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-[13px] font-semibold transition">
          ⬇ Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 font-bold text-[13px] text-white bg-[#374151]">
          📋 Task History — {filtered.length} record(s)
        </div>
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-3xl mb-2">📋</div>
            <div className="font-medium text-gray-500">No tasks match the current filters</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="bg-gray-50">
                  {['Task ID','Date','Plant','Product','DI No','Batch Code','Qty','Process','Incharge','Status','Duration','Remarks'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-left border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t,i) => {
                  const rowBg = t.status==='Completed' ? 'bg-green-50/40' : t.status==='On Hold' ? 'bg-yellow-50/40' : i%2?'bg-gray-50/30':''
                  return (
                    <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowBg}`}>
                      <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-indigo-700">{t.taskId}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-600">{t.date}</td>
                      <td className="px-3 py-2.5"><PlantBadge plant={t.plant}/></td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{t.productName}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{t.diNo||'—'}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600">{t.batchCode||'—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">{t.qty} <span className="text-[10px] text-gray-400 font-normal">{t.qtyUom||''}</span></td>
                      <td className="px-3 py-2.5 text-gray-600">{t.process||'—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{t.incharge||'—'}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={t.status||'—'}/></td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{durStr(t)}</td>
                      <td className="px-3 py-2.5 max-w-[150px] text-[11.5px] text-gray-400 truncate">{(t.remarks||'').slice(0,50)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Planning Page ─────────────────────────────────────────────────────────
const TABS = [
  { id:'dashboard', label:'📊 Dashboard' },
  { id:'planning',  label:'📅 Planning' },
  { id:'nano',      label:'Nano Plant',     dot:'#1a4a6b' },
  { id:'botanical', label:'Botanical',      dot:'#2d5e18' },
  { id:'liquid',    label:'Liquid Filling', dot:'#7c3aed' },
  { id:'powder',    label:'Powder',         dot:'#92400e' },
  { id:'granules',  label:'Granules',       dot:'#0f766e' },
  { id:'history',   label:'📋 History' },
]

export default function Planning() {
  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [tasks,        setTasks]        = useState([])
  const [drawer,       setDrawer]       = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [bmrTaskIds,   setBmrTaskIds]   = useState([])
  const [sfgOpen,      setSfgOpen]      = useState(false)
  const { toast, show: toastShow }      = useToast()

  function loadTasks() { setTasks(lsLoad(SK.tasks)) }
  useEffect(() => { loadTasks() }, [])

  const today            = todayISO()
  const activeTodayCount = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed').length

  function openBMR(taskId) {
    setBmrTaskIds(prev => prev.includes(taskId) ? prev : [...prev, taskId])
  }

  return (
    <div className="flex flex-col overflow-hidden bg-[#f0f4f8]" style={{height:'100%'}}>
      {/* Top bar */}
      <div className="bg-[#0f1923] text-white px-6 flex items-center justify-between flex-shrink-0" style={{height:56}}>
        <div className="flex items-center gap-2.5">
          <span className="font-bold text-[15px]">🏭 SOM Phyto Pharma</span>
          <span className="text-[12px] opacity-60 font-normal">Production Planning & Operations ERP</span>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setSfgOpen(true)}
            className="border border-white/30 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg text-[11.5px] font-semibold transition">
            📦 SFG Stock
          </button>
          {activeTodayCount > 0 && (
            <span className="bg-white/15 text-[11px] px-2.5 py-1 rounded">{activeTodayCount} active today</span>
          )}
          <span className="text-[12px] opacity-70">
            {new Date().toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short',year:'numeric'})}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b-2 border-gray-200 flex px-6 overflow-x-auto flex-shrink-0">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3.5 text-[13px] font-semibold border-b-[3px] -mb-0.5 whitespace-nowrap transition
              ${activeTab===tab.id ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>
            {tab.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:tab.dot}}/>}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <DashboardTab tasks={tasks} onStatusUpdate={t => setStatusTarget(t)}/>
        )}
        {activeTab === 'planning' && (
          <PlanningTab
            tasks={tasks}
            onChange={loadTasks}
            onAdd={() => setDrawer('add')}
            onEdit={t => setDrawer({ task: t })}
            toastShow={toastShow}
          />
        )}
        {['nano','botanical','liquid','powder','granules'].includes(activeTab) && (
          <PlantTab
            plant={TAB_TO_PLANT[activeTab]}
            tasks={tasks}
            onEdit={t => setDrawer({ task: t })}
            onStatusUpdate={t => setStatusTarget(t)}
            onBMR={openBMR}
          />
        )}
        {activeTab === 'history' && <HistoryTab tasks={tasks}/>}
      </div>

      {/* Add/Edit Task Drawer */}
      {drawer && (
        <AddTaskDrawer
          task={drawer === 'add' ? null : drawer.task}
          defaultDate={todayISO()}
          onSave={t => toastShow(drawer === 'add' ? `Task added — ${t.taskId}` : 'Task updated', 'ok')}
          onClose={() => { setDrawer(null); loadTasks() }}
        />
      )}

      {/* Status Update Drawer */}
      {statusTarget && (
        <StatusDrawer
          task={statusTarget}
          onSave={() => { loadTasks(); toastShow('Status updated', 'ok') }}
          onClose={() => setStatusTarget(null)}
        />
      )}

      {/* BMR Overlay */}
      {bmrTaskIds.length > 0 && (
        <BMROverlay
          openTaskIds={bmrTaskIds}
          onClose={() => { setBmrTaskIds([]); loadTasks() }}
          onTasksChange={ids => { setBmrTaskIds(ids); loadTasks() }}
        />
      )}

      {/* SFG Stock Modal */}
      {sfgOpen && <SFGStockModal onClose={() => setSfgOpen(false)}/>}

      <Toast toast={toast}/>
    </div>
  )
}
