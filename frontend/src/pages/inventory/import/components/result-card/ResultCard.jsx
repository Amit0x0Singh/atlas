export default function ResultCard({ icon: Icon, label, value, color }) {
  return (
    <div className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
      {Icon && (
        <div className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-gray-50 ${color}`}>
          <Icon size={16} />
        </div>
      )}
      <div className="min-w-0">
        <div className={`text-xl font-bold leading-tight ${color}`}>{value ?? 0}</div>
        <div className="text-gray-500 text-xs truncate">{label}</div>
      </div>
    </div>
  )
}
