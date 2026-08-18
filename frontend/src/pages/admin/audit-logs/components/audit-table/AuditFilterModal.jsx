import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'

export const EMPTY_AUDIT_FILTERS = { userId: '', action: '', module: '', tableName: '', recordId: '', ipAddress: '', dateFrom: '', dateTo: '' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/** Centered popup — same pattern used across the app's other tables. */
export default function AuditFilterModal({ open, onClose, value, onApply, userOptions, actionOptions, moduleOptions, tableOptions }) {
  const set = (patch) => onApply({ ...value, ...patch })

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Filter size={15} />
        </span>
        <h2 className="text-base font-bold text-gray-900">Filter</h2>
      </div>

      <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>User</label>
            {value.userId && <button type="button" onClick={() => set({ userId: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.userId} onChange={e => set({ userId: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Users</option>
            {userOptions.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Action</label>
            {value.action && <button type="button" onClick={() => set({ action: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.action} onChange={e => set({ action: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Actions</option>
            {actionOptions.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Module</label>
            {value.module && <button type="button" onClick={() => set({ module: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.module} onChange={e => set({ module: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Modules</option>
            {moduleOptions.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Resource (table)</label>
            {value.tableName && <button type="button" onClick={() => set({ tableName: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.tableName} onChange={e => set({ tableName: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Resources</option>
            {tableOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Record ID</label>
            {value.recordId && <button type="button" onClick={() => set({ recordId: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search record id…" value={value.recordId} onChange={e => set({ recordId: e.target.value })} className={FIELD} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>IP Address</label>
            {value.ipAddress && <button type="button" onClick={() => set({ ipAddress: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search IP…" value={value.ipAddress} onChange={e => set({ ipAddress: e.target.value })} className={FIELD} />
        </div>

        <div>
          <label className={LABEL}>Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={value.dateFrom} onChange={e => set({ dateFrom: e.target.value })} className={FIELD} />
            <input type="date" value={value.dateTo} onChange={e => set({ dateTo: e.target.value })} className={FIELD} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_AUDIT_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
