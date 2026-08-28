import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

export const EMPTY_MICROBE_FILTERS = { uom: '', stock: '', dateFrom: '', dateTo: '' }

/** Centered popup — same pattern as UsersFilterModal / RmMasterFilterModal. */
export default function MicrobeFilterModal({ open, onClose, value, onApply, uoms }) {
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
            <label className={LABEL}>UOM</label>
            {value.uom && <button type="button" onClick={() => set({ uom: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.uom} onChange={e => set({ uom: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All UOMs</option>
            {uoms.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Stock</label>
            {value.stock && <button type="button" onClick={() => set({ stock: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.stock} onChange={e => set({ stock: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All</option>
            <option value="has">Has stock</option>
            <option value="no">No stock</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Date Added Range</label>
            {(value.dateFrom || value.dateTo) && (
              <button type="button" onClick={() => set({ dateFrom: '', dateTo: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">From</span>
              <input type="date" value={value.dateFrom} max={value.dateTo || undefined}
                onChange={e => set({ dateFrom: e.target.value })} className={FIELD} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">To</span>
              <input type="date" value={value.dateTo} min={value.dateFrom || undefined}
                onChange={e => set({ dateTo: e.target.value })} className={FIELD} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_MICROBE_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
