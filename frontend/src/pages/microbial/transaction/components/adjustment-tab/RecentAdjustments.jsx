import { Clock } from 'lucide-react'
import { fmtCfu, fmtDateTime } from '../../utils/format.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { useUserDisplayNames } from '../../../../../hooks/masters/useUserDisplayNames.js'
import { REASON_LABEL } from './reasons.js'

export default function RecentAdjustments({ items = [], loading }) {
  const displayName = useUserDisplayNames()

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-base font-bold text-gray-900 mb-4">Recent Stock Loss Adjustments</h3>
      {loading ? (
        <p className="text-center py-10 text-gray-400 text-sm">Loading…</p>
      ) : items.length === 0 ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">📉</div>
          <p className="text-sm">No stock loss adjustments yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {items.slice(0, 20).map((a) => (
            <div key={a.adjustment_id} className="py-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {toTitleCase(a.microbe_name)}{' '}
                    <span className="font-mono text-xs text-gray-500">{a.container_code}</span>
                  </div>
                  <div className="text-[11px] text-gray-400">
                    {fmtDateTime(a.adjusted_at)} · {REASON_LABEL[a.reason_category] || a.reason_category}
                    {a.adjusted_by ? ` · by ${a.adjusted_by}` : ''}
                  </div>
                </div>
                <div className="text-sm font-bold text-red-600 flex-shrink-0">−{Number(a.loss_qty_kg).toFixed(3)} kg</div>
              </div>
              <div className="mt-1.5 ml-0 text-xs bg-gray-50 rounded-lg px-3 py-2 text-gray-600">
                <span className="text-gray-800">{a.reason}</span>
                {a.stage ? <span className="text-gray-400"> · stage: {a.stage}</span> : null}
                <div className="text-gray-400 mt-0.5">
                  CFU/g at adjust: {fmtCfu(a.cfu_per_g_at_adjust)} · Balance after: {Number(a.balance_after_kg).toFixed(3)} kg
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-gray-400 pt-1">
                  <Clock size={11} /> Recorded by {displayName(a.created_by)} · {fmtDateTime(a.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
