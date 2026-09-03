import { Filter } from 'lucide-react'
import { Modal, Button } from '../../../../components/ui'

export const EMPTY_PACKING_FILTERS = { type: 'ALL', status: 'ALL' }

const LABEL = 'text-[11px] font-bold text-gray-500 uppercase tracking-wide block mb-2'

const TYPE_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'PRIMARY', label: 'Primary' },
  { value: 'SECONDARY', label: 'Secondary' },
]
const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'INACTIVE', label: 'Inactive' },
]

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={[
            'text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-colors',
            value === o.value
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-500 hover:bg-gray-50',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Centered popup — same pattern as SupplierFilterModal. */
export default function PackingItemsFilterModal({ open, onClose, value, onApply }) {
  const set = (patch) => onApply({ ...value, ...patch })

  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <Filter size={15} />
        </span>
        <h2 className="text-base font-bold text-gray-900">Filter</h2>
      </div>

      <div className="px-5 py-4 space-y-5 max-h-[70vh] overflow-y-auto">
        <div>
          <label className={LABEL}>Type</label>
          <Segmented options={TYPE_OPTIONS} value={value.type} onChange={type => set({ type })} />
        </div>
        <div>
          <label className={LABEL}>Status</label>
          <Segmented options={STATUS_OPTIONS} value={value.status} onChange={status => set({ status })} />
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(EMPTY_PACKING_FILTERS)}>Reset all</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
