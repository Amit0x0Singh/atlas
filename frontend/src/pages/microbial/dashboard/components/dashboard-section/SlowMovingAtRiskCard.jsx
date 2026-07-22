export default function SlowMovingAtRiskCard({ rows }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-900 text-white text-xs font-bold">💤 Slow-Moving &amp; At-Risk Stock</div>
      <div className="p-4">
        {!rows.length ? (
          <div className="text-center py-6 text-gray-400 text-xs">
            <div className="text-2xl mb-1">✓</div>
            All stock is moving — no microbes flagged as slow-moving or near expiry
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((r) => (
              <div key={r.microbe_code} className="flex items-center justify-between py-2">
                <div>
                  <div className="text-xs font-bold text-gray-900">{r.microbe_name}</div>
                  <div className="flex gap-1.5 mt-1">
                    {r.near_exp && <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold">Expiry in {r.days_to_expiry}d</span>}
                    {r.no_movement && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold">No movement 90d</span>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold text-amber-700">{r.bal.toFixed(3)} kg</div>
                  <div className="text-[10px] text-gray-400">at risk</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
