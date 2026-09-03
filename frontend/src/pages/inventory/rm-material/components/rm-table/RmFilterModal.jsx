import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

export const EMPTY_RM_FILTERS = { status: '', uom: '', minQty: '', maxQty: '', category: '', subCategory: '', state: '', reorderLevel: '' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/**
 * Centered popup (matches UsersFilterModal in the User Roles page) — same
 * interaction pattern applied here per explicit request to bring the Users
 * toolbar (search + Sort by + Filter + Export) to the Raw Materials table.
 */
export default function RmFilterModal({ open, onClose, value, onApply, uomOptions, categoryOptions = [], subCategoryOptions = [], stateOptions = [] }) {
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
            <label className={LABEL}>Stock Status</label>
            {value.status && <button type="button" onClick={() => set({ status: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.status} onChange={e => set({ status: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>UOM</label>
            {value.uom && <button type="button" onClick={() => set({ uom: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.uom} onChange={e => set({ uom: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All UOMs</option>
            {uomOptions.map(u => <option key={u} value={u}>{u.toUpperCase()}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Category</label>
            {value.category && <button type="button" onClick={() => set({ category: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.category} onChange={e => set({ category: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Categories</option>
            {categoryOptions.map(c => <option key={c} value={c}>{toTitleCase(c)}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Sub Category</label>
            {value.subCategory && <button type="button" onClick={() => set({ subCategory: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.subCategory} onChange={e => set({ subCategory: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Sub Categories</option>
            {subCategoryOptions.map(c => <option key={c} value={c}>{toTitleCase(c)}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>State</label>
            {value.state && <button type="button" onClick={() => set({ state: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.state} onChange={e => set({ state: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All States</option>
            {stateOptions.map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Reorder Level</label>
            {value.reorderLevel && <button type="button" onClick={() => set({ reorderLevel: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.reorderLevel} onChange={e => set({ reorderLevel: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All</option>
            <option value="below">Below Reorder Level</option>
            <option value="above">Above Reorder Level</option>
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Total Qty Range</label>
            {(value.minQty || value.maxQty) && (
              <button type="button" onClick={() => set({ minQty: '', maxQty: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">Min</span>
              <input type="number" min="0" value={value.minQty} onChange={e => set({ minQty: e.target.value })} className={FIELD} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 block mb-0.5">Max</span>
              <input type="number" min="0" value={value.maxQty} onChange={e => set({ maxQty: e.target.value })} className={FIELD} />
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_RM_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
