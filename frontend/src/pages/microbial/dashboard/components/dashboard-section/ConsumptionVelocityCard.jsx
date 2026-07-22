import { trendArrow } from '../../../transaction/utils/format.js'

export default function ConsumptionVelocityCard({ rows }) {
  const maxV = rows.length ? Math.max(...rows.map((r) => r.total_kg)) : 1
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-900 text-white text-xs font-bold">📈 Consumption Velocity</div>
      <div className="p-4">
        {!rows.length ? (
          <div className="text-center py-6 text-gray-400 text-xs">No issuance data yet</div>
        ) : (
          <>
            <div className="text-[10px] text-gray-400 font-semibold mb-3">Most consumed microbes — all-time, with recent (last 3mo) vs prior-period trend</div>
            <div className="space-y-2.5">
              {rows.map((r) => {
                const t = trendArrow(r.trend)
                return (
                  <div key={r.microbe_code}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-xs font-semibold text-gray-800 truncate max-w-[55%]" title={r.microbe_name}>{r.microbe_name}</div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-[10px] text-gray-400">{r.orders} order{r.orders !== 1 ? 's' : ''}</span>
                        <span className="text-xs font-bold text-green-700">{r.total_kg.toFixed(2)} kg</span>
                        {t.symbol && <span className={`text-sm font-bold ${t.cls}`}>{t.symbol}</span>}
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-600 rounded-full" style={{ width: `${(r.total_kg / maxV) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="text-[10px] text-gray-400 mt-3">↑ Higher than previous period &nbsp; → Stable &nbsp; ↓ Lower than previous period</div>
          </>
        )}
      </div>
    </div>
  )
}
