const ICONS = { alert: '🔴', expiry: '⏳', rack: '📦', merge: '🔀', dormant: '💤' }

export default function InsightsFeed({ insights }) {
  if (!insights?.length) return null
  return (
    <div className="bg-indigo-50/60 border border-indigo-100 rounded-xl p-4">
      <div className="text-xs font-bold text-indigo-900 mb-2">🧠 Decision Support Insights</div>
      <div className="space-y-1.5">
        {insights.map((ins, i) => (
          <div key={i} className="flex items-center gap-2.5 bg-white rounded-lg px-3 py-2 text-xs">
            <span>{ICONS[ins.kind] || '•'}</span>
            <span className="flex-1 text-gray-700">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
