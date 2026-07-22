const STATUS_CLASS = {
  Fresh: 'bg-green-100 text-green-800 hover:bg-green-200',
  Moderate: 'bg-blue-100 text-blue-800 hover:bg-blue-200',
  'Near Expiry': 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  Expired: 'bg-red-100 text-red-800 hover:bg-red-200',
  Exhausted: 'bg-gray-200 text-gray-600 hover:bg-gray-300',
}

export default function RackCard({ rack, onCellClick }) {
  const headerBg = rack.pct >= 80 ? 'bg-green-800' : rack.pct >= 40 ? 'bg-amber-800' : 'bg-gray-700'

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className={`px-3 py-1.5 text-white text-[11px] font-bold flex items-center justify-between ${headerBg}`}>
        <span>RACK {rack.rack_label}</span>
        <span>{rack.occupied}/{rack.slots} ({rack.pct}%)</span>
      </div>
      <div className="p-1.5 space-y-1">
        {rack.shelves.map((sh) => (
          <div key={sh.shelf} className="flex items-stretch gap-1 bg-gray-50 rounded px-1 py-1">
            <div className="text-[9px] font-bold text-gray-400 flex items-center px-1">S{sh.shelf}</div>
            <div className="flex-1 space-y-0.5">
              {sh.rows.map((row) => (
                <div key={row.side} className="flex items-center gap-1">
                  <div className="text-[8px] text-gray-400 w-3">{row.side}</div>
                  {row.cells.map((cell) => (
                    <button
                      type="button"
                      key={cell.slot_code}
                      title={cell.container_code ? `${cell.container_code} · ${cell.microbe_name} · ${Number(cell.balance_kg).toFixed(2)}kg · ${cell.status}` : cell.slot_code}
                      onClick={() => cell.container_code && onCellClick(cell)}
                      className={`flex-1 h-5 rounded text-[8px] font-semibold truncate px-0.5 transition-colors ${cell.container_code ? STATUS_CLASS[cell.status] || 'bg-gray-100' : 'bg-gray-50 text-gray-300 cursor-default'}`}
                    >
                      {cell.container_code ? cell.microbe_code : '·'}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
