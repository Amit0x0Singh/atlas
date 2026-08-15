import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../components/ui'

const PLANTS = ['Microbial', 'Nano', 'Botanical', 'Liquid', 'Powder', 'Granules']

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

export const EMPTY_USER_FILTERS = { dateFrom: '', dateTo: '', roleId: '', plant: '', status: '', keyword: '' }

/**
 * Centered popup (not a dropdown under the trigger button) — per explicit
 * design feedback that Filter/Sort should read as a modal dialog, matching
 * the reference mockups rather than the app's usual inline anchored panel.
 */
export default function UsersFilterModal({ open, onClose, value, onApply, roles }) {
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
            <label className={LABEL}>Sign-up Date Range</label>
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

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Role</label>
            {value.roleId && <button type="button" onClick={() => set({ roleId: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.roleId} onChange={e => set({ roleId: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All roles</option>
            {roles.map(r => <option key={r.roleId} value={r.roleId}>{r.name}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Status</label>
            {value.status && <button type="button" onClick={() => set({ status: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.status} onChange={e => set({ status: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Plant Scope</label>
            {value.plant && <button type="button" onClick={() => set({ plant: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.plant} onChange={e => set({ plant: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All plants</option>
            {PLANTS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Keyword Search</label>
            {value.keyword && <button type="button" onClick={() => set({ keyword: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" placeholder="Name, email, phone…" value={value.keyword}
            onChange={e => set({ keyword: e.target.value })} className={FIELD} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_USER_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
