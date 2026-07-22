export default function DecisionCards({ decisions }) {
  if (!decisions) return null
  const { procurement = [], fefo = [], warehouse = {} } = decisions

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 text-white text-xs font-bold flex items-center justify-between" style={{ background: '#7d1f2b' }}>
          <span>🛒 Procurement Action</span>
        </div>
        <div className="p-3 space-y-2">
          {procurement.length ? procurement.map((r) => (
            <div key={r.microbe_code} className="text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <div className="flex justify-between font-semibold text-gray-900"><span>{r.microbe_name}</span><span>{r.days_cover !== null ? `${r.days_cover}d cover` : 'no data'}</span></div>
              <div className="text-gray-500 mt-0.5">{r.action}</div>
            </div>
          )) : <div className="text-xs text-gray-400 py-2">All materials adequately stocked.</div>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 text-white text-xs font-bold" style={{ background: '#12617a' }}>📤 Container Picking (FEFO)</div>
        <div className="p-3 space-y-2">
          {fefo.length ? fefo.map((r) => (
            <div key={r.container_id} className="text-xs border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <div className="flex justify-between font-semibold text-gray-900"><span className="font-mono">{r.container_code}</span><span>{r.days_to_expiry}d left</span></div>
              <div className="text-gray-500 mt-0.5">{r.microbe_name} · {r.location} · {Number(r.balance_kg).toFixed(2)}kg</div>
            </div>
          )) : <div className="text-xs text-gray-400 py-2">No active stock to pick from.</div>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 text-white text-xs font-bold" style={{ background: '#2c3338' }}>📦 Warehouse Optimization</div>
        <div className="p-3 space-y-2">
          {warehouse.rack_alert && (
            <div className="text-xs border-b border-gray-100 pb-2">
              <div className="flex justify-between font-semibold text-gray-900"><span>Rack {warehouse.rack_alert.rack}</span><span>{Math.round(warehouse.rack_alert.pct)}% full</span></div>
              <div className="text-gray-500 mt-0.5">Near capacity — avoid further inward placement here</div>
            </div>
          )}
          {warehouse.merge_candidate && (
            <div className="text-xs">
              <div className="flex justify-between font-semibold text-gray-900"><span>{warehouse.merge_candidate.microbe_name}</span><span>{warehouse.merge_candidate.slots_freed} slot{warehouse.merge_candidate.slots_freed !== 1 ? 's' : ''} freeable</span></div>
              <div className="text-gray-500 mt-0.5">{warehouse.merge_candidate.containers.length} partial containers can be merged</div>
            </div>
          )}
          {!warehouse.rack_alert && !warehouse.merge_candidate && <div className="text-xs text-gray-400 py-2">No congestion or consolidation opportunities detected.</div>}
        </div>
      </div>
    </div>
  )
}
