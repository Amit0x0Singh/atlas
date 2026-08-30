import { Calculator, RefreshCw, X, Plus, Send } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import { fmtCfu, fmtDate, cfuCoverage, G_PER_KG } from '../../utils/format.js'

// Issue panel for ONE microbe, targeting its REMAINING CFU gap (required −
// already issued). `row.calc` is a FEFO suggestion against that gap, so
// cfuCoverage's fulfilled/short/over here are all judged against the gap.
export default function RequirementRow({
  row, progress, calculating, issuing, receiverFilled,
  onCalculate, onIssue, onAllocationQtyChange, onAllocationRemove, onAllocationChange, onAddBatch,
}) {
  const { pickedKg, shortCfu, shortKgEq, overCfu, overKgEq, fulfilled, isOver } = cfuCoverage(row)
  const hasAllocs = !!row.calc?.allocations?.length
  const anyQty = (row.calc?.allocations || []).some((a) => Number(a.qty_issued_kg) > 0)

  return (
    <div className="border-t border-gray-100 bg-blue-50/40 px-4 py-3">
      <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
        <div className="text-xs text-gray-600">
          Still to issue: <strong className="text-gray-900">{fmtCfu(progress.remainingCfu)} CFU</strong>
          {' '}(≈ {progress.remainingKgEq.toFixed(3)} kg at the required potency)
        </div>
        <Button type="button" variant="outline" icon={RefreshCw} size="xs" loading={calculating} disabled={calculating} onClick={onCalculate}>
          {row.calc ? 'Recalculate' : 'Calculate FEFO'}
        </Button>
      </div>

      {!row.calc ? (
        <p className="text-xs text-gray-400">
          <Calculator size={12} className="inline -mt-0.5 mr-1" />
          Calculating suggested batches…
        </p>
      ) : (
        <>
          <div className="text-xs font-semibold mb-2">
            {row.calc.allocations.length === 0 ? (
              <span className="text-red-600">No stock available for this microbe right now</span>
            ) : isOver ? (
              <span className="text-red-600">⚠ Set to over-issue by {fmtCfu(overCfu)} CFU (≈ {overKgEq.toFixed(3)} kg) — reduce a batch quantity</span>
            ) : fulfilled ? (
              <span className="text-green-700">✓ These batches cover the remaining requirement</span>
            ) : (
              <span className="text-amber-700">
                Partial — covers {fmtCfu(cfuCoverage(row).coveredCfu)} of {fmtCfu(row.calc.total_cfu_needed)} CFU
                · still short {fmtCfu(shortCfu)} ({shortKgEq.toFixed(3)} kg)
              </span>
            )}
          </div>

          {row.calc.allocations.length > 0 && (
            <div className="text-[11px] text-gray-500 mb-2">
              Issuing <strong className="text-gray-700">{pickedKg.toFixed(3)} kg</strong> of SFG stock now
            </div>
          )}

          <div className="space-y-2">
            {row.calc.allocations.map((a) => {
              const qty = Number(a.qty_issued_kg) || 0
              const over = qty > Number(a.available_kg) + 0.0001
              const lineCfu = qty * G_PER_KG * (Number(a.cfu_per_g) || 0)
              return (
                <div key={a.inward_id} className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center bg-white border rounded-lg px-3 py-2.5 ${over ? 'border-red-300' : 'border-gray-200'}`}>
                  <div className="text-xs">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-gray-700">{a.container_code}</span>
                      <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">{a.type_code}</span>
                      {a.location && <span className="text-gray-400">📍 {a.location}</span>}
                    </div>
                    <div className="text-gray-500">
                      Batch: <strong>{a.biomass_batch_code}</strong> · Harvest {fmtDate(a.date_of_harvest)} · Expiry {a.expiry_date ? fmtDate(a.expiry_date) : '—'} · Available <strong>{Number(a.available_kg).toFixed(3)} kg</strong>
                      {a.cfu_per_g != null && <> · CFU/g {fmtCfu(Number(a.cfu_per_g))}</>}
                    </div>
                    <div className={over ? 'text-red-600 font-semibold' : 'text-blue-700'}>
                      {over
                        ? `⚠ Only ${Number(a.available_kg).toFixed(3)} kg available in this batch`
                        : `Delivers ${fmtCfu(lineCfu)} CFU from this batch`}
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-0.5">Issue Qty (kg)</label>
                    <input
                      className={`w-28 border rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 ${over ? 'border-red-400 focus:ring-red-400' : 'border-gray-300 focus:ring-blue-500'}`}
                      type="number" min="0.0001" max={a.available_kg} step="0.0001"
                      value={a.qty_issued_kg}
                      onChange={(e) => onAllocationQtyChange(a.inward_id, e.target.value)}
                    />
                  </div>
                  <div className="flex gap-1">
                    <button type="button" onClick={() => onAllocationChange(a.inward_id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Change to a different batch">
                      <RefreshCw size={14} />
                    </button>
                    <button type="button" onClick={() => onAllocationRemove(a.inward_id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove this batch">
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-between gap-3 flex-wrap mt-3">
            <button type="button" onClick={onAddBatch} className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700">
              <Plus size={13} /> Add another batch
            </button>

            <div className="flex flex-col items-end gap-1">
              <Can permission="microbial.sfg-outward.create">
                <Button
                  type="button" variant="primary" icon={Send} size="sm"
                  loading={issuing} disabled={issuing || !hasAllocs || !anyQty || isOver || !receiverFilled}
                  onClick={onIssue}
                >
                  Issue this microbe
                </Button>
              </Can>
              {!receiverFilled && <p className="text-[10px] text-red-500">Enter Receiver Name above first</p>}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
