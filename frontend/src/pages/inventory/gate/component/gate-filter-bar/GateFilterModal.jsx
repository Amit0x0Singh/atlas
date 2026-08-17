import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'
import { COMPANIES } from '../../data/companies.js'

export const EMPTY_GATE_FILTERS = { invoice_no: '', status: '', company: '', from_date: '', to_date: '' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/** Centered popup — same pattern used across the app's other tables. */
export default function GateFilterModal({ open, onClose, value, onApply }) {
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
            <label className={LABEL}>Date Range</label>
            {(value.from_date || value.to_date) && (
              <button type="button" onClick={() => set({ from_date: '', to_date: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">From</span>
              <input type="date" value={value.from_date} max={value.to_date || undefined}
                onChange={e => set({ from_date: e.target.value })} className={FIELD} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">To</span>
              <input type="date" value={value.to_date} min={value.from_date || undefined}
                onChange={e => set({ to_date: e.target.value })} className={FIELD} />
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Invoice No.</label>
            {value.invoice_no && <button type="button" onClick={() => set({ invoice_no: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search invoice no…" value={value.invoice_no} onChange={e => set({ invoice_no: e.target.value })} className={FIELD} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Status</label>
            {value.status && <button type="button" onClick={() => set({ status: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.status} onChange={e => set({ status: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Company</label>
            {value.company && <button type="button" onClick={() => set({ company: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.company} onChange={e => set({ company: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Companies</option>
            {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_GATE_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
