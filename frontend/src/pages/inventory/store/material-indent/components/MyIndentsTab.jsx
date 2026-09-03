import { useState, useEffect, useCallback } from 'react'
import { Search, RotateCcw, Loader2 } from 'lucide-react'
import { Button, ConfirmModal } from '../../../../../components/ui'
import { materialIndentApi } from '../../../../../api/inventory.js'
import { useApp } from '../../../../../context/context.jsx'
import { useOptionValues } from '../../../../../hooks/useOptionValues.js'
import IndentDetailModal from './IndentDetailModal.jsx'
import { STATUS_META, PRIORITY_META, statusPill, fmtDate, requesterLabel } from '../shared.js'

const FIELD_CLS = 'border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500 bg-white'

export default function MyIndentsTab({ onEditDraft, refreshKey }) {
  const { user, hasAnyPermission } = useApp()
  // The Store and admins see every department's indents here and can filter by
  // department; everyone else is scoped server-side to their own department.
  const canSeeAll = hasAnyPermission(['admin.panel.access', 'inventory.material-indent.issue'])
  const { data: departments = [] } = useOptionValues(canSeeAll ? 'MATERIAL_INDENT_DEPARTMENT' : null)

  const [rows, setRows]       = useState([])
  const [loading, setLoading] = useState(true)
  const [f, setF] = useState({ q: '', status: '', priority: '', from: '', to: '', dept: '' })

  const [detail, setDetail]       = useState(null)
  const [cancelId, setCancelId]   = useState(null)
  const [busy, setBusy]           = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    const params = { scope: 'mine' }
    if (f.status)   params.status = f.status
    if (f.priority) params.priority = f.priority
    if (f.from)     params.dateFrom = f.from
    if (f.to)       params.dateTo = f.to
    if (f.q.trim()) params.q = f.q.trim()
    if (canSeeAll && f.dept) params.department = f.dept
    materialIndentApi.list(params)
      .then(r => setRows(r.data || []))
      .catch(() => setRows([]))
      .finally(() => setLoading(false))
  }, [f, canSeeAll])

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load, refreshKey])

  const doCancel = async () => {
    setBusy(true)
    try { await materialIndentApi.cancel(cancelId); setCancelId(null); load() }
    catch { setCancelId(null) }
    finally { setBusy(false) }
  }

  const clearFilters = () => setF({ q: '', status: '', priority: '', from: '', to: '', dept: '' })
  const hasFilter = f.q || f.status || f.priority || f.from || f.to || f.dept

  return (
    <div className="p-4 md:p-6">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className={`${FIELD_CLS} w-full pl-9`} placeholder="Indent no., item, department…"
            value={f.q} onChange={e => setF(s => ({ ...s, q: e.target.value }))} />
        </div>
        {canSeeAll && (
          <select className={FIELD_CLS} value={f.dept} onChange={e => setF(s => ({ ...s, dept: e.target.value }))}>
            <option value="">All departments</option>
            {departments.map(d => <option key={d.code} value={d.code}>{d.label}</option>)}
          </select>
        )}
        <select className={FIELD_CLS} value={f.status} onChange={e => setF(s => ({ ...s, status: e.target.value }))}>
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select className={FIELD_CLS} value={f.priority} onChange={e => setF(s => ({ ...s, priority: e.target.value }))}>
          <option value="">All priorities</option>
          {['Normal', 'Urgent', 'Critical'].map(p => <option key={p}>{p}</option>)}
        </select>
        <input type="date" className={FIELD_CLS} value={f.from} onChange={e => setF(s => ({ ...s, from: e.target.value }))} />
        <input type="date" className={FIELD_CLS} value={f.to} onChange={e => setF(s => ({ ...s, to: e.target.value }))} />
        {hasFilter && <Button variant="ghost" size="sm" icon={RotateCcw} onClick={clearFilters}>Clear</Button>}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-700 text-white text-xs">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Indent No.</th>
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Department</th>
                <th className="text-left px-4 py-3 font-semibold">Requested By</th>
                <th className="text-center px-4 py-3 font-semibold">Items</th>
                <th className="text-left px-4 py-3 font-semibold">Priority</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-right px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400"><Loader2 className="animate-spin mx-auto mb-2" size={22} />Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-400"><div className="text-2xl mb-2">📋</div>No indents match these filters.</td></tr>
              ) : rows.map(ind => {
                const s = statusPill(ind.status)
                const mine = !ind.createdBy || ind.createdBy === user?.email
                return (
                  <tr key={ind.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-indigo-700">{ind.indentNo || 'Draft'}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-500">{fmtDate(ind.submittedAt || ind.createdAt)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{ind.departmentName}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-700">{mine ? 'You' : requesterLabel(ind)}</td>
                    <td className="px-4 py-2.5 text-center text-xs text-gray-700">{ind.lineCount ?? ind.items?.length ?? 0}</td>
                    <td className={`px-4 py-2.5 text-xs ${(PRIORITY_META[ind.priority] || {}).cls}`}>{ind.priority}</td>
                    <td className="px-4 py-2.5"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button className="text-xs font-semibold text-gray-600 hover:text-indigo-700 px-2" onClick={() => setDetail(ind)}>View</button>
                      {mine && ind.status === 'DRAFT' && (
                        <button className="text-xs font-semibold text-gray-600 hover:text-indigo-700 px-2" onClick={() => onEditDraft(ind)}>Edit</button>
                      )}
                      {mine && ['DRAFT', 'OPEN'].includes(ind.status) && (
                        <button className="text-xs font-semibold text-red-600 hover:text-red-700 px-2" onClick={() => setCancelId(ind.id)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <IndentDetailModal indent={detail} open={!!detail} onClose={() => setDetail(null)} />
      <ConfirmModal
        open={!!cancelId}
        title="Cancel this indent?"
        message="The Store will no longer see this request. This cannot be undone."
        acceptText="Cancel Indent"
        variant="danger"
        loading={busy}
        onAccept={doCancel}
        onCancel={() => setCancelId(null)}
      />
    </div>
  )
}
