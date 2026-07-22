import { abcBadgeCls } from '../../../transaction/utils/format.js'

export default function AbcClassificationCard({ rows }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-blue-700 text-white text-xs font-bold">🔬 ABC Classification &amp; Expiry Risk</div>
      <div className="p-4">
        <div className="text-[10.5px] text-gray-500 mb-2">
          <strong>ABC</strong>: A = top 80% consumption (critical stock) · B = next 15% · C = low movement · <span className="text-red-600">Risk %</span> = stock expiring within 60 days
        </div>
        {!rows.length ? (
          <div className="text-center py-6 text-gray-400 text-xs">No data</div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr>{['Microbe', 'Class', 'Consumed 6M (kg)', 'Stock (kg)', 'Expiry Risk %'].map((h) => <th key={h} className="text-left px-2 py-1.5 font-bold text-gray-500 uppercase bg-gray-50 border-b border-gray-200">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.microbe_code} className="border-b border-gray-100">
                  <td className="px-2 py-1.5 font-medium text-gray-800">{r.microbe_name}</td>
                  <td className="px-2 py-1.5 text-center"><span className={abcBadgeCls(r.abc_class)}>{r.abc_class}</span></td>
                  <td className="px-2 py-1.5 font-mono text-gray-700">{r.consumed_recent_kg.toFixed(2)}</td>
                  <td className="px-2 py-1.5 font-mono text-gray-700">{r.stock_kg.toFixed(2)}</td>
                  <td className={`px-2 py-1.5 font-semibold ${r.expiry_risk_pct >= 50 ? 'text-red-600' : r.expiry_risk_pct >= 25 ? 'text-amber-600' : 'text-gray-400'}`}>{r.expiry_risk_pct > 0 ? `${Math.round(r.expiry_risk_pct)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
