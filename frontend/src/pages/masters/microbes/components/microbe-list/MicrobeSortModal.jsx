import { ArrowUpDown } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'

export const DEFAULT_MICROBE_SORT = { field: 'name', direction: 'asc' }

function RadioRow({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer group">
      <span className={[
        'w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 transition-colors',
        checked ? 'border-blue-600' : 'border-gray-300 group-hover:border-gray-400',
      ].join(' ')}>
        {checked && <span className="w-2 h-2 rounded-full bg-blue-600" />}
      </span>
      <input type="radio" className="sr-only" checked={checked} onChange={onChange} />
      <span className={`text-[13px] ${checked ? 'text-gray-900 font-medium' : 'text-gray-600'}`}>{children}</span>
    </label>
  )
}

function SortGroup({ title, field, active, onPick, options }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-0">
      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
      {options.map(o => (
        <RadioRow key={o.value} checked={active.field === field && active.direction === o.value} onChange={() => onPick({ field, direction: o.value })}>
          {o.label}
        </RadioRow>
      ))}
    </div>
  )
}

/** Centered popup — same pattern as UsersSortModal / RmMasterSortModal. */
export default function MicrobeSortModal({ open, onClose, value, onApply }) {
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
          <ArrowUpDown size={15} />
        </span>
        <h2 className="text-base font-bold text-gray-900">Sort by</h2>
      </div>

      <div className="px-5 py-1 max-h-[70vh] overflow-y-auto">
        <SortGroup title="Microbe Name" field="name" active={value} onPick={onApply}
          options={[{ value: 'asc', label: 'A-Z' }, { value: 'desc', label: 'Z-A' }]} />
        <SortGroup title="Code" field="code" active={value} onPick={onApply}
          options={[{ value: 'asc', label: 'A-Z' }, { value: 'desc', label: 'Z-A' }]} />
        <SortGroup title="Date Added" field="dateAdded" active={value} onPick={onApply}
          options={[{ value: 'desc', label: 'Newest first' }, { value: 'asc', label: 'Oldest first' }]} />
        <SortGroup title="Stock" field="stock" active={value} onPick={onApply}
          options={[{ value: 'desc', label: 'Has stock first' }, { value: 'asc', label: 'No stock first' }]} />
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Button variant="outline-gray" onClick={() => onApply(DEFAULT_MICROBE_SORT)}>Reset</Button>
        <Button variant="primary" onClick={onClose}>Apply now</Button>
      </div>
    </Modal>
  )
}
