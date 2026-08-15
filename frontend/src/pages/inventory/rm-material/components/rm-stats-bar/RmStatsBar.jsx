import './RmStatsBar.css'

export default function RmStatsBar({ items }) {
  const inStockCount    = items.filter(i => i.totalStock  > 0).length
  const outOfStockCount = items.filter(i => i.totalStock <= 0).length

  return (
    <div className="grid grid-cols-3 gap-3 mb-5">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="text-xl font-bold text-gray-900">{items.length}</div>
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">Total Items</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="text-xl font-bold text-emerald-600">{inStockCount}</div>
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">In Stock</div>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3">
        <div className="text-xl font-bold text-red-500">{outOfStockCount}</div>
        <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">Out of Stock</div>
      </div>
    </div>
  )
}
