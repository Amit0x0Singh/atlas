import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../../components/ui'

export const EMPTY_PACK_TABLE_FILTERS = { status: '' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/** Centered popup — same pattern as RmMasterFilterModal / RmFilterModal (stock page).
 *  Status maps onto the existing `showCompleted` boolean: "Pending only" keeps
 *  completed groups hidden (the page's original default), "Show completed too"
 *  reveals both. A stricter "completed only" view isn't wired up server-side/
 *  client-side today, so this stays a clean two-way toggle expressed as a filter
 *  field instead of the old standalone button. */
export default function PackTableFilterModal({ open, onClose, value, onApply }) {
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
            <label className={LABEL}>Status</label>
            {value.status && <button type="button" onClick={() => set({ status: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.status} onChange={e => set({ status: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">Pending only</option>
            <option value="ALL">Show completed too</option>
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_PACK_TABLE_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
