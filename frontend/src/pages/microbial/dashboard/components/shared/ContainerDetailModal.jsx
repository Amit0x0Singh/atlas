import { useState } from 'react'
import { Modal, Button } from '../../../../../components/ui'
import { PauseCircle, PlayCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import { stockStatusBadgeCls, fmtDate, fmtCfu } from '../../../transaction/utils/format.js'
import { useContainerBatches, useMarkContainerInactive, useReactivateContainer } from '../../../../../hooks/microbial/useMicrobialStorage.js'
import { useUserDisplayNames } from '../../../../../hooks/masters/useUserDisplayNames.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  : '—'

function expiryOf(batch) {
  if (!batch.shelf_life_days || !batch.date_of_harvest) return null
  const d = new Date(batch.date_of_harvest)
  d.setDate(d.getDate() + batch.shelf_life_days)
  return d
}

function daysLeft(date) {
  if (!date) return null
  return Math.floor((date - new Date()) / 86400000)
}

// Shared "what's in this container" popup — used by the Storage Map (a slot
// click) and the Stock Summary → Container Ledger page (the Details button).
// Deliberately omits the issuance history the prototype's container modal
// carried: here it's just current holdings + batch history.
export default function ContainerDetailModal({ container, onClose }) {
  const containerId = container?.container_id
  const { data: batches = [], isLoading } = useContainerBatches(containerId, !!container)
  const markInactive = useMarkContainerInactive()
  const reactivate = useReactivateContainer()
  const displayName = useUserDisplayNames()
  const [expandedId, setExpandedId] = useState(null)

  const isInactive = !!container?.inactive
  const balance = batches.length
    ? batches.reduce((s, b) => s + Number(b.remaining_qty_kg), 0)
    : Number(container?.balance_kg ?? 0)
  const location = container?.slot_code || container?.location || container?.inactive_location || '—'

  const handleMarkInactive = async () => {
    const msg = balance > 0
      ? `This container still has ${balance.toFixed(4)} kg balance. Mark inactive anyway? It will be hidden from the Storage Map and issuance, but all data stays intact and searchable in Stock Summary.`
      : 'Mark this empty container as inactive? It will be hidden from the Storage Map and issuance picking. All transaction history remains fully searchable.'
    if (!confirm(msg)) return
    try { await markInactive.mutateAsync(containerId); onClose() } catch (err) { alert(err.message) }
  }

  const handleReactivate = async () => {
    if (!confirm(`Reactivate ${container.container_code}? You'll need to assign it a new storage slot via a new inward entry.`)) return
    try { await reactivate.mutateAsync(containerId); onClose() } catch (err) { alert(err.message) }
  }

  return (
    <Modal open={!!container} onClose={onClose} size="xl">
      {container && (
        <div className="flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="px-6 pt-6 pb-5 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-1">{location}</div>
                <h2 className="text-lg font-bold text-gray-900 font-mono">{container.container_code}</h2>
              </div>
              <span className={stockStatusBadgeCls(isInactive ? 'Exhausted' : container.status)}>
                {isInactive ? 'Inactive' : container.status}
              </span>
            </div>

            {isInactive && (
              <div className="mt-3 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600">
                <PauseCircle size={14} className="flex-shrink-0" />
                Hidden from Storage Map and issuance picking — history stays fully traceable below.
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Microbe</div>
                <div className="font-semibold text-gray-900 text-sm">{toTitleCase(container.microbe_name)}</div>
                <div className="text-xs text-gray-400">{container.microbe_code}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Type</div>
                <span className="inline-block px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[10px] font-semibold">{container.microbe_type}</span>
              </div>
              <div>
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">Balance</div>
                <div className="font-bold text-green-700 text-base">{balance.toFixed(3)} kg</div>
              </div>
              <div className="flex items-end">
                {isInactive ? (
                  <Button variant="outline-gray" icon={PlayCircle} size="sm" disabled={reactivate.isPending} loading={reactivate.isPending} onClick={handleReactivate}>Reactivate</Button>
                ) : (
                  <Button variant="outline-gray" icon={PauseCircle} size="sm" disabled={markInactive.isPending} loading={markInactive.isPending} onClick={handleMarkInactive}>Mark Inactive</Button>
                )}
              </div>
            </div>
          </div>

          {/* Batches */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-3">Batches ({batches.length})</div>
            {isLoading ? (
              <p className="text-center py-8 text-gray-400 text-sm">Loading batches…</p>
            ) : !batches.length ? (
              <p className="text-center py-8 text-gray-400 text-sm">No batches recorded for this container.</p>
            ) : (
              <div className="space-y-2">
                {batches.map((b) => {
                  const exhausted = Number(b.remaining_qty_kg) < 0.001 && Number(b.total_qty_kg) > 0
                  const expiry = expiryOf(b)
                  const dleft = daysLeft(expiry)
                  const isOpen = expandedId === b.inward_id
                  return (
                    <div key={b.inward_id} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setExpandedId(isOpen ? null : b.inward_id)}
                        className={`w-full flex items-center justify-between px-3.5 py-2.5 text-left ${exhausted ? 'bg-gray-50' : 'bg-white hover:bg-gray-50/60'}`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {isOpen ? <ChevronUp size={14} className="text-gray-400 flex-shrink-0" /> : <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />}
                          <span className="font-mono text-xs font-bold text-gray-800 truncate">{b.biomass_batch_code}</span>
                          <span className="text-[11px] text-gray-400 whitespace-nowrap hidden sm:inline">Harvest: {fmtDate(b.date_of_harvest)}</span>
                          {exhausted && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[9px] font-bold whitespace-nowrap">Exhausted</span>}
                        </div>
                        <div className="text-right flex-shrink-0 pl-3">
                          <div className={`text-sm font-bold ${exhausted ? 'text-gray-400' : 'text-green-700'}`}>{Number(b.remaining_qty_kg).toFixed(3)} kg</div>
                          <div className="text-[10px] text-gray-400">of {Number(b.total_qty_kg).toFixed(3)}</div>
                        </div>
                      </button>
                      {isOpen && (
                        <div className={`px-3.5 py-3 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs ${exhausted ? 'bg-gray-50/60' : 'bg-green-50/30'}`}>
                          <div><span className="text-gray-400">Specs (CFU/g):</span> <b className="text-gray-800">{fmtCfu(b.inhouse_cfu_per_g)}</b></div>
                          <div><span className="text-gray-400">Moisture:</span> <b className="text-gray-800">{b.moisture != null ? `${b.moisture}%` : '—'}</b></div>
                          <div><span className="text-gray-400">Harvest Date:</span> <b className="text-gray-800">{fmtDate(b.date_of_harvest)}</b></div>
                          <div><span className="text-gray-400">Expiry Date:</span> <b className="text-gray-800">{expiry ? `${fmtDate(expiry)} (${dleft}d)` : '—'}</b></div>
                          <div><span className="text-gray-400">Received by:</span> <b className="text-gray-800">{b.received_by || '—'}</b></div>
                          <div><span className="text-gray-400">Pouches:</span> <b className="text-gray-800">{b.pouch_nos ?? '—'}×{b.pouch_qty ?? '—'}kg</b></div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {(container.created_at || container.updated_at) && (
            <div className="flex items-center justify-between gap-3 px-6 py-3 border-t border-gray-100 text-xs text-gray-400 flex-shrink-0 flex-wrap">
              <span className="flex items-center gap-1.5"><Clock size={12} /> Created by {displayName(container.created_by)} · {fmtDateTime(container.created_at)}</span>
              <span className="flex items-center gap-1.5"><Clock size={12} /> Updated by {displayName(container.updated_by)} · {fmtDateTime(container.updated_at)}</span>
            </div>
          )}
        </div>
      )}
    </Modal>
  )
}
