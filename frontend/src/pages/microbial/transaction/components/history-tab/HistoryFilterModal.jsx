import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-1.5'
const FIELD = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white'

export const EMPTY_HISTORY_FILTERS = { microbeCode: '', from: '', to: '' }

/** Centered popup — same pattern as the Stock Ledger's LedgerFilterModal. */
export default function HistoryFilterModal({ open, onClose, value, onApply, microbes }) {
  const set = (patch) => onApply({ ...value, ...patch })

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Filter size={15} />
        </span>
        <h2 className="text-base font-bold text-gray-900">Filter</h2>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Microbe</label>
            {value.microbeCode && <button type="button" onClick={() => set({ microbeCode: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <select value={value.microbeCode} onChange={(e) => set({ microbeCode: e.target.value })} className={`${FIELD} cursor-pointer`}>
            <option value="">All Microbes</option>
            {microbes.map((m) => <option key={m.microbeId} value={m.microbeCode}>{toTitleCase(m.microbeName)} ({m.microbeCode})</option>)}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className={LABEL}>Date Range</label>
            {(value.from || value.to) && <button type="button" onClick={() => set({ from: '', to: '' })} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>}
          </div>
          <div className="flex items-center gap-2">
            <input type="date" value={value.from} max={value.to || undefined} onChange={(e) => set({ from: e.target.value })} className={FIELD} />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={value.to} min={value.from || undefined} onChange={(e) => set({ to: e.target.value })} className={FIELD} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_HISTORY_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
