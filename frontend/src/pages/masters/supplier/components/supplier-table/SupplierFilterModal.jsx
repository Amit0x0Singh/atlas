import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

export const EMPTY_SUPPLIER_FILTERS = { phone: '', email: '', gstin: '', address: '' }

/** Centered popup — same pattern as UsersFilterModal / RmMasterFilterModal. */
export default function SupplierFilterModal({ open, onClose, value, onApply }) {
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
            <label className={LABEL}>Phone</label>
            {value.phone && <button type="button" onClick={() => set({ phone: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search phone…" value={value.phone}
            onChange={e => set({ phone: e.target.value })} className={FIELD} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Email</label>
            {value.email && <button type="button" onClick={() => set({ email: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search email…" value={value.email}
            onChange={e => set({ email: e.target.value })} className={FIELD} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>GSTIN</label>
            {value.gstin && <button type="button" onClick={() => set({ gstin: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search GSTIN…" value={value.gstin}
            onChange={e => set({ gstin: e.target.value })} className={FIELD} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Address</label>
            {value.address && <button type="button" onClick={() => set({ address: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Search address…" value={value.address}
            onChange={e => set({ address: e.target.value })} className={FIELD} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_SUPPLIER_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
