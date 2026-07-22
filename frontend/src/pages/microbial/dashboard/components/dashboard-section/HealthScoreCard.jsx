import { useState } from 'react'
import { healthColor } from '../../../transaction/utils/format.js'

export default function HealthScoreCard({ health, loading }) {
  const [showWhy, setShowWhy] = useState(false)
  if (loading || !health) return null
  const color = healthColor(health.score)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-extrabold flex-shrink-0" style={{ background: color }}>
          {health.score}
        </div>
        <div className="flex-1 min-w-[220px]">
          <div className="text-sm font-bold text-gray-900">Inventory Health Score</div>
          <div className="text-xs text-gray-500 mt-0.5">
            100 − avg(Procurement Risk, Expiry Risk, Dormancy) ·{' '}
            <button type="button" className="text-blue-600 font-semibold hover:underline" onClick={() => setShowWhy((s) => !s)}>Why?</button>
          </div>
        </div>
        <div className="flex gap-5 ml-auto">
          <div className="text-center min-w-[64px]">
            <div className="text-base font-bold font-mono text-red-700">{health.procurement_risk_pct}%</div>
            <div className="text-[9.5px] text-gray-400 uppercase tracking-wide">Procurement Risk</div>
          </div>
          <div className="text-center min-w-[64px]">
            <div className="text-base font-bold font-mono text-amber-700">{health.expiry_risk_pct}%</div>
            <div className="text-[9.5px] text-gray-400 uppercase tracking-wide">Expiry Risk</div>
          </div>
          <div className="text-center min-w-[64px]">
            <div className="text-base font-bold font-mono text-blue-800">{health.dormancy_pct}%</div>
            <div className="text-[9.5px] text-gray-400 uppercase tracking-wide">Dormancy</div>
          </div>
        </div>
      </div>
      {showWhy && (
        <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-600 space-y-1.5">
          <div><strong>Procurement Risk:</strong> {health.procurement_risk_pct}% ({health.at_risk}/{health.total_microbes} microbes at Critical/Reorder Now/Out of Stock)</div>
          <div><strong>Expiry Risk:</strong> {health.expiry_risk_pct}% ({health.exp_risk}/{health.total_batches} live batches expiring ≤30d)</div>
          <div><strong>Dormancy:</strong> {health.dormancy_pct}% ({health.dormant_count} microbes with stock unused ≥90d)</div>
          <div className="text-gray-400 pt-1">Method: Health Score = 100 − average(Procurement Risk %, Expiry Risk %, Dormancy %). Each component is measured over your actual current data — no hidden weighting.</div>
        </div>
      )}
    </div>
  )
}
