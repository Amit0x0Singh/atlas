import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'

export const EMPTY_PRODUCT_FILTERS = { productCode: '', plant: '', uom: '', state: '' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/** Centered popup — same pattern used across the app's other tables. */
export default function ProductFilterModal({ open, onClose, value, onApply, plantOptions, uomOptions, stateOptions }) {
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
            <label className={LABEL}>Product Code</label>
            {value.productCode && <button type="button" onClick={() => set({ productCode: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search code…" value={value.productCode} onChange={e => set({ productCode: e.target.value })} className={FIELD} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Plant</label>
            {value.plant && <button type="button" onClick={() => set({ plant: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.plant} onChange={e => set({ plant: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Plants</option>
            {plantOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>UOM</label>
            {value.uom && <button type="button" onClick={() => set({ uom: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.uom} onChange={e => set({ uom: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All UOM</option>
            {uomOptions.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>State</label>
            {value.state && <button type="button" onClick={() => set({ state: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.state} onChange={e => set({ state: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All States</option>
            {stateOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_PRODUCT_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
