import { useState } from 'react'
import { useStorageGrid } from '../../../../../hooks/microbial/useMicrobialStorage.js'
import RackCard from './RackCard.jsx'
import SlotDetailModal from './SlotDetailModal.jsx'

const LEGEND = [
  { label: 'Fresh', cls: 'bg-green-100 text-green-800' },
  { label: 'Moderate', cls: 'bg-blue-100 text-blue-800' },
  { label: 'Near Expiry', cls: 'bg-amber-100 text-amber-800' },
  { label: 'Expired', cls: 'bg-red-100 text-red-800' },
  { label: 'Exhausted', cls: 'bg-gray-200 text-gray-600' },
  { label: 'Empty', cls: 'bg-gray-50 text-gray-400' },
]

export default function StorageSection() {
  const { data, isLoading } = useStorageGrid()
  const [selectedCell, setSelectedCell] = useState(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-slate-800 text-white flex items-center justify-between flex-wrap gap-2">
        <span className="text-sm font-bold">▤ Storage Map — 15 Racks × 8 Shelves × 6 Slots = 720 Locations</span>
        {data?.summary && (
          <span className="text-xs opacity-90">Occupied: {data.summary.occupied}/{data.summary.total_slots} ({data.summary.occupancy_pct}%) · Near Expiry: {data.summary.near_expiry} · Expired: {data.summary.expired}</span>
        )}
      </div>

      <div className="px-4 py-2.5 flex gap-1.5 flex-wrap border-b border-gray-100">
        {LEGEND.map((l) => (
          <span key={l.label} className={`px-2 py-0.5 rounded text-[10px] font-semibold ${l.cls}`}>{l.label}</span>
        ))}
      </div>

      <div className="p-4">
        {isLoading ? (
          <p className="text-center py-14 text-gray-400">Loading storage map…</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {(data?.racks || []).map((rack) => (
              <RackCard key={rack.rack} rack={rack} onCellClick={setSelectedCell} />
            ))}
          </div>
        )}
      </div>

      <SlotDetailModal cell={selectedCell} onClose={() => setSelectedCell(null)} />
    </div>
  )
}
