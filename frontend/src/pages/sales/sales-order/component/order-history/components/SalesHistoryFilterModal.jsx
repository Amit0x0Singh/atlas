import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../../components/ui'
import { useOptionValues } from '../../../../../../hooks/useOptionValues.js'
import { STATUSES, STATUS_LABELS } from '../../../shared/constants.js'

export const EMPTY_SALES_HISTORY_FILTERS = { status: '', company: '', from_date: '', to_date: '' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/** Centered popup — same pattern as InwardHistoryFilterModal / PackTableFilterModal. */
export default function SalesHistoryFilterModal({ open, onClose, value, onApply }) {
  const set = (patch) => onApply({ ...value, ...patch })
  // company is stored lowercase (text-normalization standard) — option value
  // matches storage so the filter actually matches; label keeps the code as-is.
  const { data: companies = [] } = useOptionValues('COMPANY')

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
            <label className={LABEL}>Status</label>
            {value.status && <button type="button" onClick={() => set({ status: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.status} onChange={e => set({ status: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Company</label>
            {value.company && <button type="button" onClick={() => set({ company: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.company} onChange={e => set({ company: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Companies</option>
            {companies.map(c => <option key={c.code} value={c.code.toLowerCase()}>{c.label}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Order Date Range</label>
            {(value.from_date || value.to_date) && <button type="button" onClick={() => set({ from_date: '', to_date: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={value.from_date} onChange={e => set({ from_date: e.target.value })} className={FIELD} />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={value.to_date} onChange={e => set({ to_date: e.target.value })} className={FIELD} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_SALES_HISTORY_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
