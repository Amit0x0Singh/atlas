import { useMemo, useState } from 'react'
import { Search, RotateCcw, Loader2, ClipboardList, ArrowRight } from 'lucide-react'
import { Button } from '../../../../../../components/ui'
import { useOptionValues } from '../../../../../../hooks/useOptionValues.js'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'
import { STATUS_META, PRIORITY_META, statusPill, fmtDate, requesterLabel } from '../../../material-indent/shared.js'

const FIELD_CLS = 'border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white outline-none focus:ring-2 focus:ring-indigo-400'
const PRIORITY_RANK = { Critical: 0, Urgent: 1, Normal: 2 }

function IndentCard({ ind, onOpen }) {
  const s = statusPill(ind.status)
  return (
    <button type="button" onClick={() => onOpen(ind)}
      className="group w-full text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-indigo-300 transition-all overflow-hidden">
      <div className="flex items-stretch">
        <span className={`w-1.5 shrink-0 ${ind.priority === 'Critical' ? 'bg-red-400' : ind.priority === 'Urgent' ? 'bg-amber-400' : 'bg-indigo-300'}`} />
        <div className="flex-1 min-w-0 p-3 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <span className="font-mono font-bold text-sm text-gray-900">{ind.indentNo}</span>
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">{ind.departmentName}</span>
              <span className={`text-[10px] ${(PRIORITY_META[ind.priority] || {}).cls}`}>{ind.priority}</span>
            </div>
            <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${s.cls}`}>{s.label}</span>
          </div>
          <div className="flex items-center gap-x-2 gap-y-0.5 mt-1.5 flex-wrap text-[11px] text-gray-400">
            <span>{fmtDate(ind.submittedAt || ind.createdAt)}</span>
            <span className="truncate max-w-[160px]">{requesterLabel(ind)}</span>
            <span className="font-semibold text-gray-600">{ind.lineCount} item{ind.lineCount !== 1 ? 's' : ''}</span>
            {ind.liveLines > 0 && <span className="font-bold text-indigo-700">{ind.doneLines}/{ind.liveLines} issued</span>}
          </div>
          <p className="mt-1 text-[11px] text-gray-400 truncate">
            {(ind.items || []).map(i => toTitleCase(i.itemName)).join(', ')}
          </p>
        </div>
        <div className="hidden md:flex items-center pr-4">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 group-hover:bg-violet-700 text-white text-[12px] font-bold px-3.5 py-2 transition-colors">
            {['COMPLETED', 'REJECTED', 'CANCELLED'].includes(ind.status) ? 'View' : 'Issue'} <ArrowRight size={14} />
          </span>
        </div>
      </div>
    </button>
  )
}

// Indent History is a browse-and-review list, not an action queue — a compact
// table reads better there than the cards used for the Open tab.
function IndentHistoryTable({ rows, onOpen }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-700 text-white text-xs">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Indent No.</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-left px-4 py-3 font-semibold">Department</th>
              <th className="text-left px-4 py-3 font-semibold">Requested By</th>
              <th className="text-left px-4 py-3 font-semibold">Items</th>
              <th className="text-center px-4 py-3 font-semibold">Issued</th>
              <th className="text-left px-4 py-3 font-semibold">Priority</th>
              <th className="text-left px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(ind => {
              const s = statusPill(ind.status)
              return (
                <tr key={ind.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2.5 font-mono text-xs font-semibold text-indigo-700">{ind.indentNo || '—'}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 whitespace-nowrap">{fmtDate(ind.submittedAt || ind.createdAt)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{ind.departmentName}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-700">{requesterLabel(ind)}</td>
                  <td className="px-4 py-2.5 text-xs text-gray-500 max-w-[280px] truncate">
                    {(ind.items || []).map(i => toTitleCase(i.itemName)).join(', ')}
                  </td>
                  <td className="px-4 py-2.5 text-center text-xs text-gray-700">{ind.doneLines ?? 0}/{ind.liveLines ?? ind.lineCount ?? 0}</td>
                  <td className={`px-4 py-2.5 text-xs ${(PRIORITY_META[ind.priority] || {}).cls}`}>{ind.priority}</td>
                  <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></td>
                  <td className="px-4 py-2.5 text-right">
                    <button className="text-xs font-semibold text-gray-600 hover:text-indigo-700 px-2" onClick={() => onOpen(ind)}>View</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default function IndentSelectStep({ view, indents, loading, onOpen, onReload }) {
  const { data: departments = [] } = useOptionValues('MATERIAL_INDENT_DEPARTMENT')
  const [f, setF] = useState({ q: '', department: '', priority: '', date: '', sort: 'priority' })

  const filtered = useMemo(() => {
    const term = f.q.trim().toLowerCase()
    let list = indents.filter(ind =>
      (!f.department || ind.departmentCode === f.department) &&
      (!f.priority || ind.priority === f.priority) &&
      (!f.date || String(ind.submittedAt || ind.createdAt).slice(0, 10) === f.date) &&
      (!term || `${ind.indentNo || ''} ${ind.departmentName} ${ind.requesterName || ''} ${ind.createdBy || ''} ${(ind.items || []).map(i => i.itemName).join(' ')}`.toLowerCase().includes(term))
    )
    list = [...list].sort((a, b) => {
      if (f.sort === 'priority') return (PRIORITY_RANK[a.priority] ?? 3) - (PRIORITY_RANK[b.priority] ?? 3) || new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt)
      if (f.sort === 'oldest')   return new Date(a.submittedAt || a.createdAt) - new Date(b.submittedAt || b.createdAt)
      return new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt) // newest
    })
    return list
  }, [indents, f])

  const hasFilter = f.q || f.department || f.priority || f.date

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
        <p className="text-sm text-gray-500">
          {view === 'open'
            ? 'Open and partially-issued indents from plant sections. Issue each line by scanning a pack or container QR.'
            : 'Completed, rejected and cancelled indents.'}
        </p>
        <Button variant="outline-gray" size="sm" icon={RotateCcw} onClick={onReload}>Refresh</Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-3 mb-5 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${FIELD_CLS} w-full pl-9`} placeholder="Search indent no., item, requester…"
            value={f.q} onChange={e => setF(s => ({ ...s, q: e.target.value }))} />
        </div>
        <select className={FIELD_CLS} value={f.department} onChange={e => setF(s => ({ ...s, department: e.target.value }))}>
          <option value="">All departments</option>
          {departments.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
        </select>
        <select className={FIELD_CLS} value={f.priority} onChange={e => setF(s => ({ ...s, priority: e.target.value }))}>
          <option value="">All priorities</option>
          {['Normal', 'Urgent', 'Critical'].map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" className={FIELD_CLS} value={f.date} onChange={e => setF(s => ({ ...s, date: e.target.value }))} />
        <select className={FIELD_CLS} value={f.sort} onChange={e => setF(s => ({ ...s, sort: e.target.value }))}>
          <option value="priority">Priority first</option>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
        {hasFilter && <Button variant="ghost" size="sm" icon={RotateCcw} onClick={() => setF({ q: '', department: '', priority: '', date: '', sort: f.sort })}>Clear</Button>}
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-400"><Loader2 size={24} className="animate-spin mx-auto mb-2" />Loading indents…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-dashed border-gray-300 rounded-2xl px-4 py-14 text-center">
          <ClipboardList size={28} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-600 font-semibold">{hasFilter ? 'Nothing matches your filters' : view === 'open' ? 'No open indents' : 'No indent history yet'}</p>
        </div>
      ) : view === 'history' ? (
        <IndentHistoryTable rows={filtered} onOpen={onOpen} />
      ) : (
        <div className="grid gap-2.5 2xl:grid-cols-2">
          {filtered.map(ind => <IndentCard key={ind.id} ind={ind} onOpen={onOpen} />)}
        </div>
      )}
    </div>
  )
}
