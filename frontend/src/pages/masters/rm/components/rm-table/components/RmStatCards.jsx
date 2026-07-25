import { Package, Boxes, Warehouse, Archive } from 'lucide-react'

function StatCard({ icon: Icon, tone, label, value, loading }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-4 py-3.5 flex items-center gap-3">
      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${tone}`}>
        <Icon size={16} strokeWidth={2.25} />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-gray-900 leading-tight">{loading ? '—' : value}</p>
      </div>
    </div>
  )
}

export default function RmStatCards({ rmTotal, packCount, bulkCount, packingTotal, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <StatCard icon={Package}   tone="bg-indigo-50 text-indigo-600" label="Total RM Items"     value={rmTotal}     loading={loading} />
      <StatCard icon={Boxes}     tone="bg-blue-50 text-blue-600"     label="PACK Items"          value={packCount}   loading={loading} />
      <StatCard icon={Warehouse} tone="bg-green-50 text-green-600"   label="BULK Items"          value={bulkCount}   loading={loading} />
      <StatCard icon={Archive}   tone="bg-violet-50 text-violet-600" label="Packing Materials"   value={packingTotal} loading={loading} />
    </div>
  )
}
