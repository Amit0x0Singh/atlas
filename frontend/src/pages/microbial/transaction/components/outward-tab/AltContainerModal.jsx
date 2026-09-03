import { Modal } from '../../../../../components/ui'
import { fmtCfu, fmtDate, G_PER_KG } from '../../utils/format.js'

// Batch picker for a microbe issuance requirement. Two modes:
//   swap — replace one allocation with a different batch
//   add  — draw part of the requirement from an extra batch (split issuance)
export default function AltContainerModal({ open, onClose, batches, onSelect, mode = 'swap', gap = null, requiredCfuPerG = 0 }) {
  const isAdd = mode === 'add'
  const shortCfu = gap?.shortCfu || 0
  const shortKgEq = gap?.shortKgEq || 0

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 mb-1">
          {isAdd ? 'Add a batch to this requirement' : 'Change Container'}
        </h3>
        <p className="text-xs text-gray-500 mb-3">
          {isAdd
            ? 'Issue part of this microbe from another batch. The quantity is pre-filled to cover what’s still needed, at that batch’s own potency — edit it after adding.'
            : 'Pick an alternate batch to issue from instead.'}
        </p>

        {isAdd && shortCfu > 1 && (
          <div className="mb-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Still needed: {fmtCfu(shortCfu)} CFU (≈ {shortKgEq.toFixed(3)} kg at the required potency)
          </div>
        )}
        {isAdd && shortCfu <= 1 && (
          <div className="mb-3 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            Requirement is already fully covered — any batch you add will be split against the total, adjust quantities after.
          </div>
        )}

        {batches.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No other eligible batches for this microbe.</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {batches.map((b) => {
              const potency = Number(b.cfu_per_g) || 0
              const maxCfuFromBatch = Number(b.available_kg) * G_PER_KG * potency
              const coversRemainder = isAdd && shortCfu > 1 && maxCfuFromBatch + 1 >= shortCfu
              return (
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
                      {coversRemainder && <span className="px-1.5 py-0.5 rounded bg-green-100 text-green-700 text-[10px] font-semibold">covers the rest</span>}
                    </div>
                    <div className="text-gray-500">
                      Batch: <strong>{b.biomass_batch_code}</strong> · Harvest {fmtDate(b.date_of_harvest)} · Expiry {b.expiry_date ? fmtDate(b.expiry_date) : '—'} · CFU/g {fmtCfu(potency)}
                    </div>
                    <div className="text-gray-400">Max from this batch: {fmtCfu(maxCfuFromBatch)} CFU</div>
                  </div>
                  <div className="text-sm font-bold text-gray-900 flex-shrink-0">{Number(b.available_kg).toFixed(3)} kg</div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </Modal>
  )
}
