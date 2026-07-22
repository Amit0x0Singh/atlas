import { useState } from 'react'
import { Download } from 'lucide-react'
import { PLANT_KEYS } from '../../../planning/data/plantConfig.js'
import { todayISO } from '../../../planning/utils/date.js'
import { Button } from '../../../../../components/ui'
import StatusBadge from '../../../planning/components/ui/status-badge/StatusBadge.jsx'
import PlantBadge from '../../../planning/components/ui/plant-badge/PlantBadge.jsx'

export default function HistoryTab({ tasks }) {
  const [search,   setSearch]   = useState('')
  const [plant,    setPlant]    = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')

  const filtered = tasks.filter(t => {
    const q  = search.toLowerCase()
    const mq = !q || t.productName.toLowerCase().includes(q) || (t.taskId || '').toLowerCase().includes(q) || (t.diNo || '').toLowerCase().includes(q)
    const mp = !plant    || t.plant    === plant
    const mf = !fromDate || t.date    >= fromDate
    const mt = !toDate   || t.date    <= toDate
    return mq && mp && mf && mt
  }).sort((a, b) => b.date.localeCompare(a.date))

  function exportCSV() {
    if (!filtered.length) { alert('Nothing to export'); return }
    const hdrs = ['Task ID', 'Date', 'Plant', 'Product', 'DI No', 'Batch Code', 'Qty', 'Process', 'Incharge', 'Shift', 'Equipment', 'Carrier', 'Specs', 'Status', 'Remarks', 'Timer Start', 'Timer End']
    const rows = filtered.map(t => [
      t.taskId, t.date, t.plant, t.productName, t.diNo || '', t.batchCode || '',
      t.qty, t.process, t.incharge, t.shift || '', t.equipment || '', t.carrier || '', t.specs || '',
      t.status, t.remarks || '', t.timerStart || '', t.timerEnd || ''
    ].map(v => `"${String(v || '').replace(/"/g, '""')}"`).join(','))
    const csv = [hdrs.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `production_history_${todayISO()}.csv`
    a.click()
  }

  function durStr(t) {
    if (!t.timerStart || !t.timerEnd) return '—'
    const s = (new Date(t.timerEnd) - new Date(t.timerStart)) / 1000
    return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
  }

  return (
    <div className="p-6">
      <div className="flex gap-2.5 mb-4 flex-wrap items-center">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search product, task ID, DI number..."
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400 prodp-history-search" />
        <select value={plant} onChange={e => setPlant(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] bg-white focus:outline-none focus:border-blue-400">
          <option value="">All Plants</option>
          {PLANT_KEYS.map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-[13px] focus:outline-none focus:border-blue-400" />
        <Button variant="secondary" icon={Download} size="sm" onClick={exportCSV}>Export CSV</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 font-bold text-[13px] text-white bg-[#374151]">
          📋 Production History — {filtered.length} record(s)
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
                  {['Task ID', 'Date', 'Plant', 'Product', 'DI No', 'Batch Code', 'Qty', 'Process', 'Incharge', 'Status', 'Duration', 'Remarks'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-[10.5px] font-bold text-gray-400 uppercase tracking-wider text-left border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => {
                  const rowBg = t.status === 'Completed' ? 'bg-green-50/40' : t.status === 'On Hold' ? 'bg-yellow-50/40' : i % 2 ? 'bg-gray-50/30' : ''
                  return (
                    <tr key={t.id} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${rowBg}`}>
                      <td className="px-3 py-2.5 font-mono text-[11px] font-bold text-indigo-700">{t.taskId}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-600">{t.date}</td>
                      <td className="px-3 py-2.5"><PlantBadge plant={t.plant} /></td>
                      <td className="px-3 py-2.5 font-semibold text-gray-800">{t.productName}</td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{t.diNo || '—'}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px] text-gray-600">{t.batchCode || '—'}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-700">{t.qty} <span className="text-[10px] text-gray-400 font-normal">{t.qtyUom || ''}</span></td>
                      <td className="px-3 py-2.5 text-gray-600">{t.process || '—'}</td>
                      <td className="px-3 py-2.5 text-gray-600">{t.incharge || '—'}</td>
                      <td className="px-3 py-2.5"><StatusBadge status={t.status || '—'} /></td>
                      <td className="px-3 py-2.5 text-[11.5px] text-gray-500">{durStr(t)}</td>
                      <td className="px-3 py-2.5 max-w-[150px] text-[11.5px] text-gray-400 truncate">{(t.remarks || '').slice(0, 50)}</td>
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
