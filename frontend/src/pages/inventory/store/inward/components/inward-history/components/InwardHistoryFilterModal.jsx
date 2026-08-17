import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../../../components/ui'

export const EMPTY_INWARD_HISTORY_FILTERS = { supplier: '', dateFrom: '', dateTo: '' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/** Centered popup — same pattern as RmMasterFilterModal / RmFilterModal (stock page). */
export default function InwardHistoryFilterModal({ open, onClose, value, onApply, suppliers }) {
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
            <label className={LABEL}>Supplier</label>
            {value.supplier && <button type="button" onClick={() => set({ supplier: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.supplier} onChange={e => set({ supplier: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Suppliers</option>
            {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Date Range</label>
            {(value.dateFrom || value.dateTo) && <button type="button" onClick={() => set({ dateFrom: '', dateTo: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={value.dateFrom} onChange={e => set({ dateFrom: e.target.value })} className={FIELD} />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={value.dateTo} onChange={e => set({ dateTo: e.target.value })} className={FIELD} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_INWARD_HISTORY_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
