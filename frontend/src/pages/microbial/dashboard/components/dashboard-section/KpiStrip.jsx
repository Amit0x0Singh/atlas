import { Boxes, Container, AlertTriangle, Bell, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react'

const CARDS = [
  { key: 'total_stock_kg', label: 'Total Stock', icon: Boxes, color: 'blue', fmt: (v) => `${Number(v).toFixed(2)} kg` },
  { key: 'active_containers', label: 'Active Containers', icon: Container, color: 'indigo', fmt: (v) => v },
  { key: 'expiring_soon_count', label: 'Expiring ≤30d', icon: AlertTriangle, color: 'amber', fmt: (v) => v },
  { key: 'reorder_alerts', label: 'Reorder Alerts', icon: Bell, color: 'red', fmt: (v) => v },
  { key: 'today_inward_kg', label: "Today Inward", icon: ArrowDownToLine, color: 'green', fmt: (v) => `${Number(v).toFixed(3)} kg` },
  { key: 'today_issued_kg', label: "Today Issued", icon: ArrowUpFromLine, color: 'violet', fmt: (v) => `${Number(v).toFixed(3)} kg` },
]

const COLORS = {
  blue: 'bg-blue-50 text-blue-600', indigo: 'bg-indigo-50 text-indigo-600', violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600', green: 'bg-green-50 text-green-600', red: 'bg-red-50 text-red-600',
}

export default function KpiStrip({ data, loading }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {CARDS.map(({ key, label, icon: Icon, color, fmt }) => (
        <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${COLORS[color]}`}>
            <Icon size={16} />
          </div>
          <div className="text-xl font-extrabold text-gray-900">{loading ? '—' : fmt(data?.[key] ?? 0)}</div>
          <div className="text-[11px] font-semibold text-gray-500 mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}
