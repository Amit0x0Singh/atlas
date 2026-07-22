import { Modal } from '../../../../../components/ui'
import { fmtCfu, fmtDate } from '../../utils/format.js'

export default function AltContainerModal({ open, onClose, batches, onSelect }) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 mb-1">Change Container</h3>
        <p className="text-xs text-gray-500 mb-4">Pick an alternate batch to issue from instead.</p>

        {batches.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No other eligible batches for this microbe.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {batches.map((b) => (
              <button
                type="button"
                key={b.inward_id}
                onClick={() => onSelect(b)}
                className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50/40 text-left"
              >
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono font-bold text-gray-800">{b.container_code}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">{b.type_code}</span>
                    {b.location && <span className="text-gray-400">📍 {b.location}</span>}
                  </div>
                  <div className="text-gray-500">
                    Batch: <strong>{b.biomass_batch_code}</strong> · Harvest {fmtDate(b.date_of_harvest)} · Expiry {b.expiry_date ? fmtDate(b.expiry_date) : '—'} · CFU/g {fmtCfu(b.cfu_per_g)}
                  </div>
                </div>
                <div className="text-sm font-bold text-gray-900 flex-shrink-0">{Number(b.available_kg).toFixed(3)} kg</div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  )
}
