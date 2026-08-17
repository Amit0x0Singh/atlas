import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../../components/ui'
import { useLedgerMeta } from '../../../../../../hooks/inventory/useLedger.js'
import { useOptionValues } from '../../../../../../hooks/useOptionValues.js'

export const EMPTY_LEDGER_FILTERS = { transactionType: '', fromDate: '', toDate: '', warehouse: '', reference: '', direction: '' }

const DIRECTION_OPTIONS = [
  { value: 'IN',  label: 'Stock In' },
  { value: 'OUT', label: 'Stock Out' },
]

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

/** Centered popup — same pattern as RmMasterFilterModal / RmFilterModal (stock page).
 *  Transaction-type options come from the backend's own canonical list so this
 *  can never offer a value the ledger doesn't actually produce; warehouse
 *  options reuse the same admin-managed WAREHOUSE option group Pack Inward/
 *  Sales already source their warehouse pickers from (same as the old
 *  LedgerFilters/MasterFilters bar this replaces). */
export default function LedgerFilterModal({ open, onClose, value, onApply }) {
  const { data: meta } = useLedgerMeta()
  const { data: warehouses = [] } = useOptionValues('WAREHOUSE')
  const transactionTypeOptions = (meta?.transactionTypes || []).map(t => ({ value: t.value, label: t.label }))
  const warehouseOptions = warehouses.map(w => ({ value: w.code, label: w.label }))

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
            <label className={LABEL}>Transaction Type</label>
            {value.transactionType && <button type="button" onClick={() => set({ transactionType: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.transactionType} onChange={e => set({ transactionType: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Types</option>
            {transactionTypeOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Date Range</label>
            {(value.fromDate || value.toDate) && <button type="button" onClick={() => set({ fromDate: '', toDate: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={value.fromDate} onChange={e => set({ fromDate: e.target.value })} className={FIELD} />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={value.toDate} onChange={e => set({ toDate: e.target.value })} className={FIELD} />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Location</label>
            {value.warehouse && <button type="button" onClick={() => set({ warehouse: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.warehouse} onChange={e => set({ warehouse: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Locations</option>
            {warehouseOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Reference / Batch</label>
            {value.reference && <button type="button" onClick={() => set({ reference: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <input type="text" value={value.reference} onChange={e => set({ reference: e.target.value })} placeholder="Search batch, lot, reference…" className={FIELD} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Direction</label>
            {value.direction && <button type="button" onClick={() => set({ direction: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.direction} onChange={e => set({ direction: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All</option>
            {DIRECTION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_LEDGER_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
