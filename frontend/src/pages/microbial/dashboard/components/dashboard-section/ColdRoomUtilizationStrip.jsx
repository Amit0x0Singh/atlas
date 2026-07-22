export default function ColdRoomUtilizationStrip({ summary, onOpenStorage }) {
  if (!summary) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
      <div className="text-xs font-bold text-gray-700">📦 Cold Room Utilization</div>
      <div className="px-3 py-1 rounded-lg bg-green-50 ring-1 ring-inset ring-green-200 text-xs">
        <strong className="text-green-800">Occupied:</strong> <span className="font-mono font-bold text-green-800">{summary.occupied}</span><span className="text-green-800"> / {summary.total_slots}</span>
      </div>
      <div className="px-3 py-1 rounded-lg bg-blue-50 ring-1 ring-inset ring-blue-200 text-xs">
        <strong className="text-blue-800">Utilization:</strong> <span className="font-mono font-bold text-blue-800">{summary.occupancy_pct}%</span>
      </div>
      <div className="px-3 py-1 rounded-lg bg-amber-50 ring-1 ring-inset ring-amber-200 text-xs">
        <strong className="text-amber-800">Near Expiry:</strong> <span className="font-mono font-bold text-amber-800">{summary.near_expiry}</span>
      </div>
      <div className="px-3 py-1 rounded-lg bg-red-50 ring-1 ring-inset ring-red-200 text-xs">
        <strong className="text-red-800">Expired:</strong> <span className="font-mono font-bold text-red-800">{summary.expired}</span>
      </div>
      <button type="button" className="ml-auto text-xs font-semibold text-blue-700 hover:underline" onClick={onOpenStorage}>▤ Open Storage Map →</button>
    </div>
  )
}
