import { useMemo, useState } from 'react'
import { X } from 'lucide-react'
import { Button, IconButton } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import { useApp } from '../../../../../context/context.jsx'
import { useMicrobeSuggestions } from '../../../../../hooks/masters/useMicrobes.js'
import { useEligibleBatches } from '../../../../../hooks/microbial/useMicrobialOutward.js'
import { useMicrobialAdjustments, useCreateAdjustment } from '../../../../../hooks/microbial/useMicrobialAdjustment.js'
import { fmtCfu, fmtDate } from '../../utils/format.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import MicrobeAutocomplete from '../shared/MicrobeAutocomplete.jsx'
import RecentAdjustments from './RecentAdjustments.jsx'
import { REASON_CATEGORIES } from './reasons.js'

const FIELD = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-red-400'
const LABEL = 'block text-sm font-semibold text-gray-700 mb-1.5'

export default function AdjustmentTab() {
  const { user } = useApp()

  const { data: microbes = [] } = useMicrobeSuggestions()
  const eligibleBatches = useEligibleBatches()
  const createAdjustment = useCreateAdjustment()
  const { data: recent = [], isLoading: recentLoading } = useMicrobialAdjustments()

  const [microbe, setMicrobe] = useState(null)
  const [batches, setBatches] = useState([])
  const [loadingBatches, setLoadingBatches] = useState(false)
  const [selectedInwardId, setSelectedInwardId] = useState('')
  const [lossQty, setLossQty] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [reason, setReason] = useState('')
  const [stage, setStage] = useState('')
  const [adjustedBy, setAdjustedBy] = useState(user?.fullName || user?.name || user?.email || '')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const selectedBatch = useMemo(
    () => batches.find((b) => b.inward_id === selectedInwardId) || null,
    [batches, selectedInwardId],
  )
  const maxQty = selectedBatch ? Number(selectedBatch.available_kg) : 0
  const lossNum = parseFloat(lossQty)
  const lossValid = !isNaN(lossNum) && lossNum > 0 && lossNum <= maxQty + 0.0001

  const clearBatch = () => { setSelectedInwardId(''); setLossQty(''); setReasonCategory(''); setReason(''); setStage(''); setRemarks('') }

  const pickMicrobe = async (m) => {
    setMicrobe(m)
    setBatches([])
    clearBatch()
    setError(''); setSuccess('')
    if (!m) return
    setLoadingBatches(true)
    try {
      const rows = await eligibleBatches.mutateAsync(m.microbeCode)
      setBatches(rows || [])
      if (!rows?.length) setError(`No active stock found for ${toTitleCase(m.microbeName)} — nothing to adjust.`)
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to load batches.')
    } finally {
      setLoadingBatches(false)
    }
  }

  const submit = async () => {
    setError(''); setSuccess('')
    if (!selectedBatch) { setError('Select the batch / container the loss occurred in'); return }
    if (!lossValid) { setError(`Enter a valid loss quantity (max ${maxQty.toFixed(3)} kg)`); return }
    if (!reasonCategory) { setError('Select a reason category'); return }
    if (!reason.trim() || reason.trim().length < 3) { setError('Describe what happened (reason detail)'); return }
    if (!adjustedBy.trim()) { setError('Enter the name of the person recording this loss'); return }

    try {
      const r = await createAdjustment.mutateAsync({
        inward_id: selectedBatch.inward_id,
        loss_qty_kg: lossNum,
        reason_category: reasonCategory,
        reason: reason.trim(),
        stage: stage.trim() || undefined,
        adjusted_by: adjustedBy.trim(),
        remarks: remarks.trim() || undefined,
      })
      const statusPart = r.new_status ? ` · Batch status: ${r.new_status}` : ''
      setSuccess(
        `Recorded loss of ${lossNum.toFixed(3)} kg against ${selectedBatch.container_code}. ` +
        `Remaining: ${Number(r.new_remaining).toFixed(3)} kg${statusPart}`,
      )
      // Refresh the batch list so the new remaining qty / exhausted batch is reflected
      setMicrobe(microbe)
      const rows = await eligibleBatches.mutateAsync(microbe.microbeCode).catch(() => [])
      setBatches(rows || [])
      clearBatch()
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to record the adjustment.')
    }
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-5 max-w-2xl">
        <h3 className="text-base font-bold text-gray-900">Record Stock Loss</h3>
        <p className="text-xs text-gray-500 mt-1 mb-4">
          Book biomass lost during issuance, release to production, or transport between
          storage locations against the exact batch it was lost from. This appears in
          Transaction History and reduces the batch and container stock immediately.
        </p>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}

        {/* Step 1 — microbe */}
        <div className="mb-4">
          <label className={LABEL}>Microbe *</label>
          <MicrobeAutocomplete value={microbe?.microbeName || ''} microbes={microbes} onSelect={pickMicrobe} />
        </div>

        {/* Step 2 — batch / container */}
        {microbe && (
          <div className="mb-4">
            <label className={LABEL}>Batch / Container the loss occurred in *</label>
            {loadingBatches ? (
              <p className="text-xs text-gray-400">Loading batches…</p>
            ) : batches.length === 0 ? (
              <p className="text-xs text-gray-400">No active batches for this microbe.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {batches.map((b) => (
                  <button
                    type="button"
                    key={b.inward_id}
                    onClick={() => { setSelectedInwardId(b.inward_id); setLossQty('') }}
                    className={`w-full flex items-center justify-between border rounded-lg px-3 py-2.5 text-left transition ${
                      selectedInwardId === b.inward_id
                        ? 'border-red-400 bg-red-50/60 ring-1 ring-red-300'
                        : 'border-gray-200 hover:border-red-300 hover:bg-red-50/30'
                    }`}
                  >
                    <div className="text-xs min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-gray-800">{b.container_code}</span>
                        {b.type_code && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">{b.type_code}</span>}
                        {b.location && <span className="text-gray-400 truncate">📍 {b.location}</span>}
                      </div>
                      <div className="text-gray-500">
                        Batch: <strong>{b.biomass_batch_code}</strong> · Harvest {fmtDate(b.date_of_harvest)}
                        {b.expiry_date ? ` · Expiry ${fmtDate(b.expiry_date)}` : ''} · CFU/g {fmtCfu(b.cfu_per_g)}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-gray-900 flex-shrink-0 ml-2">{Number(b.available_kg).toFixed(3)} kg</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 3 — loss detail */}
        {selectedBatch && (
          <div className="space-y-4 border-t border-gray-100 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex justify-between items-start gap-2">
              <div className="min-w-0 text-sm">
                <div className="text-[10px] font-semibold text-red-400 uppercase tracking-widest mb-0.5">Selected Batch</div>
                <div className="font-mono font-bold text-red-900 truncate">{selectedBatch.container_code}</div>
                <div className="text-red-700 mt-0.5">{toTitleCase(microbe.microbeName)} · {selectedBatch.biomass_batch_code}</div>
                <div className="text-xs text-red-500 mt-0.5">Available: {maxQty.toFixed(3)} kg</div>
              </div>
              <IconButton icon={X} onClick={clearBatch} variant="danger" size="sm" tooltip="Clear" className="flex-shrink-0" />
            </div>

            <div>
              <label className={LABEL}>
                Loss Quantity (KG) * <span className="text-xs font-normal text-gray-400">(max {maxQty.toFixed(3)})</span>
              </label>
              <input
                type="number" min="0.001" step="0.001" max={maxQty}
                value={lossQty}
                onChange={(e) => setLossQty(e.target.value)}
                placeholder="0.000"
                className={FIELD}
              />
              {lossValid && (
                <p className="text-xs text-gray-400 mt-1.5">
                  After adjustment: <strong className="text-gray-700">{(maxQty - lossNum).toFixed(3)} kg</strong> remaining in this batch
                </p>
              )}
            </div>

            <div>
              <label className={LABEL}>Reason *</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {REASON_CATEGORIES.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => setReasonCategory(r.value)}
                    className={`text-xs px-3 py-2 rounded-lg border text-left transition ${
                      reasonCategory === r.value
                        ? 'bg-red-500 border-red-500 text-white font-semibold'
                        : 'border-gray-200 text-gray-600 hover:border-red-300 hover:bg-red-50'
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className={LABEL}>What happened? *</label>
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. bag torn while loading for transport to Plant 2"
                className={FIELD}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Stage / Location <span className="text-xs font-normal text-gray-400">(optional)</span></label>
                <input value={stage} onChange={(e) => setStage(e.target.value)} placeholder="e.g. Cold Room → Plant 2" className={FIELD} />
              </div>
              <div>
                <label className={LABEL}>Recorded By *</label>
                <input value={adjustedBy} onChange={(e) => setAdjustedBy(e.target.value)} placeholder="Person responsible" className={FIELD} />
              </div>
            </div>

            <div>
              <label className={LABEL}>Remarks <span className="text-xs font-normal text-gray-400">(optional)</span></label>
              <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any additional note" className={FIELD} />
            </div>

            <Can permission="microbial.sfg-adjustment.create">
              <Button
                onClick={submit}
                disabled={createAdjustment.isPending || !lossValid || !reasonCategory || !reason.trim() || !adjustedBy.trim()}
                loading={createAdjustment.isPending}
                variant="danger-solid"
                fullWidth
              >
                {createAdjustment.isPending ? 'Recording…' : 'Record Stock Loss'}
              </Button>
            </Can>
          </div>
        )}
      </div>

      <RecentAdjustments items={recent} loading={recentLoading} />
    </div>
  )
}
