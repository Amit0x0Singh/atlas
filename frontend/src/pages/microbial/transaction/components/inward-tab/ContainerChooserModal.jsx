import { Modal } from '../../../../../components/ui'
import { fillBadgeCls } from '../../utils/format.js'

export default function ContainerChooserModal({ open, onClose, microbeName, typeLabel, containers, nextCode, onChooseExisting, onChooseNew }) {
  return (
    <Modal open={open} onClose={onClose} size="md">
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 mb-1">Select Container</h3>
        <p className="text-xs text-gray-500 mb-4">{microbeName} — {typeLabel}</p>

        {containers.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No existing containers for this combination. Create new below.</p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Existing containers — click to add a new batch</p>
            {containers.map((c) => (
              <button
                type="button"
                key={c.container_id}
                onClick={() => onChooseExisting(c)}
                className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2.5 hover:border-blue-400 hover:bg-blue-50/40 text-left"
              >
                <div>
                  <div className="font-mono text-sm font-bold text-gray-900 flex items-center gap-2">
                    {c.container_code}
                    {c.inactive && <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-600 text-[9px] font-bold">⏸ INACTIVE — will reactivate</span>}
                  </div>
                  <div className="text-xs text-gray-500">Location: <strong>{c.inactive ? `${c.inactive_location || '—'} (freed — reassign)` : (c.location || '—')}</strong> · {c.batch_count} batch(es)</div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-gray-900">{Number(c.current_qty_kg).toFixed(3)} kg</div>
                  <span className={fillBadgeCls(c.fill_status)}>{c.fill_status}</span>
                </div>
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={onChooseNew}
          className="w-full py-2.5 bg-white border-2 border-green-600 rounded-lg text-sm font-bold text-green-700 flex items-center justify-center gap-2 hover:bg-green-50"
        >
          ✦ Create New Container <span className="font-mono text-xs opacity-70">{nextCode ? `→ ${nextCode}` : ''}</span>
        </button>
      </div>
    </Modal>
  )
}
