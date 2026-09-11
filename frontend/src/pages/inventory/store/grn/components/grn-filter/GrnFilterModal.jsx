import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../../components/ui'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

// Client-side facets for the GRN sidebar list. The list is fully loaded, so
// filtering happens in the browser — see applyGrnFilters below.
export const EMPTY_GRN_FILTERS = {
  fromDate: '',
  toDate: '',
  supplier: '',
  company: '',
  minBags: '',
}

// How many facets are actually narrowing the list right now.
export function countActiveGrnFilters(f) {
  return Object.values(f).filter(v => v !== '' && v != null).length
}

// Apply the facets to a GRN list (already newest-first from the API).
export function applyGrnFilters(list, f) {
  const from = f.fromDate ? new Date(`${f.fromDate}T00:00:00`) : null
  const to   = f.toDate ? new Date(`${f.toDate}T23:59:59.999`) : null
  const minBags = f.minBags !== '' && f.minBags != null ? Number(f.minBags) : null
  const supplier = (f.supplier || '').toLowerCase()
  const company  = (f.company || '').toLowerCase()

  return list.filter(grn => {
    const when = grn.receivedDate || grn.createdAt
    const d = when ? new Date(when) : null
    if (from && (!d || d < from)) return false
    if (to && (!d || d > to)) return false
    if (supplier && (grn.supplier || '').toLowerCase() !== supplier) return false
    if (company && (grn.company || '').toLowerCase() !== company) return false
    if (minBags != null && Number(grn.totalPacks || 0) < minBags) return false
    return true
  })
}

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 bg-white'

export default function GrnFilterModal({ open, onClose, value, onApply, suppliers = [], companies = [] }) {
  const set = (patch) => onApply({ ...value, ...patch })
  const activeCount = countActiveGrnFilters(value)

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
          <Filter size={15} />
        </span>
        <div>
          <h2 className="text-base font-bold text-gray-900">Filter GRNs</h2>
          <p className="text-[11px] text-gray-400">Narrow the list by date, supplier or company</p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
        {/* Received date range */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Received Date</label>
            {(value.fromDate || value.toDate) && (
              <button type="button" onClick={() => set({ fromDate: '', toDate: '' })} className="text-[11px] font-semibold text-indigo-600 hover:underline">Reset</button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block">From</span>
              <input type="date" value={value.fromDate} max={value.toDate || undefined}
                onChange={e => set({ fromDate: e.target.value })} className={`${FIELD} cursor-pointer`} />
            </div>
            <div>
              <span className="text-[10px] text-gray-400 mb-1 block">To</span>
              <input type="date" value={value.toDate} min={value.fromDate || undefined}
                onChange={e => set({ toDate: e.target.value })} className={`${FIELD} cursor-pointer`} />
            </div>
          </div>
        </div>

        {/* Supplier */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Supplier</label>
            {value.supplier && <button type="button" onClick={() => set({ supplier: '' })} className="text-[11px] font-semibold text-indigo-600 hover:underline">Reset</button>}
          </div>
          <select value={value.supplier} onChange={e => set({ supplier: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All suppliers</option>
            {suppliers.map(s => <option key={s} value={s}>{toTitleCase(s)}</option>)}
          </select>
        </div>

        {/* Company */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Company</label>
            {value.company && <button type="button" onClick={() => set({ company: '' })} className="text-[11px] font-semibold text-indigo-600 hover:underline">Reset</button>}
          </div>
          <select value={value.company} onChange={e => set({ company: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All companies</option>
            {companies.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        {/* Minimum bags */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Minimum Bags</label>
            {value.minBags !== '' && <button type="button" onClick={() => set({ minBags: '' })} className="text-[11px] font-semibold text-indigo-600 hover:underline">Reset</button>}
          </div>
          <input type="number" min="0" step="1" inputMode="numeric" placeholder="Any"
            value={value.minBags} onChange={e => set({ minBags: e.target.value })} className={FIELD} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_GRN_FILTERS)} disabled={activeCount === 0}>
          Reset all
        </Button>
        <Button variant="primary" onClick={onClose}>
          {activeCount > 0 ? `Apply (${activeCount})` : 'Done'}
        </Button>
      </div>
    </Modal>
  )
}
