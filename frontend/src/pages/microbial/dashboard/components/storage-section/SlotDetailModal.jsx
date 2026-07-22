import { Modal, Button } from '../../../../../components/ui'
import { PauseCircle } from 'lucide-react'
import { stockStatusBadgeCls } from '../../../transaction/utils/format.js'
import { useMarkContainerInactive } from '../../../../../hooks/microbial/useMicrobialStorage.js'

export default function SlotDetailModal({ cell, onClose }) {
  const markInactive = useMarkContainerInactive()

  const handleMarkInactive = async () => {
    if (!cell) return
    const msg = Number(cell.balance_kg) > 0
      ? `This container still has ${Number(cell.balance_kg).toFixed(4)} kg balance. Mark inactive anyway? It will be hidden from the Storage Map and issuance, but all data stays intact and searchable in Stock Summary.`
      : 'Mark this empty container as inactive? It will be hidden from the Storage Map and issuance picking. All transaction history remains fully searchable.'
    if (!confirm(msg)) return
    try {
      await markInactive.mutateAsync(cell.container_id)
      onClose()
    } catch (err) { alert(err.message) }
  }

  return (
    <Modal open={!!cell} onClose={onClose} size="sm">
      {cell && (
        <div className="p-6">
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{cell.slot_code}</div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 font-mono">{cell.container_code}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm mb-5">
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Microbe</div>
              <div className="font-semibold text-gray-900">{cell.microbe_name}</div>
              <div className="text-xs text-gray-400">{cell.microbe_code}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Type</div>
              <div className="text-gray-800">{cell.microbe_type}</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Balance</div>
              <div className="font-bold text-green-700 text-base">{Number(cell.balance_kg).toFixed(3)} kg</div>
            </div>
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Status</div>
              <span className={stockStatusBadgeCls(cell.status)}>{cell.status}</span>
            </div>
          </div>
          <Button variant="outline-gray" icon={PauseCircle} size="sm" disabled={markInactive.isPending} loading={markInactive.isPending} onClick={handleMarkInactive}>
            Mark Inactive
          </Button>
        </div>
      )}
    </Modal>
  )
}
