import { reorderSignalBadgeCls } from '../../../transaction/utils/format.js'

export default function ReorderSignalsTable({ rows }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-red-800 text-white text-xs font-bold flex items-center justify-between flex-wrap gap-1">
        <span>⚠ Reorder Signals — Procurement Action Required</span>
        <span className="font-normal opacity-80">Based on consumption vs current stock over your full data window</span>
      </div>
      {!rows.length ? (
        <div className="text-center py-10 text-gray-400">
          <div className="text-3xl mb-2">📊</div>
          <p className="text-sm">No issuance data yet — reorder signals appear once stock is issued.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {['Microbe', 'Type', 'Avg / Month (kg)', 'Current Stock (kg)', 'Days Cover', 'Signal', 'Suggested Action'].map((h) => (
                  <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase tracking-wide bg-gray-50 border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.microbe_code} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-semibold text-gray-900">{r.microbe_name}</td>
                  <td className="px-3 py-2 text-gray-600">{r.microbe_type}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{r.avg_per_month.toFixed(3)}<div className="text-[9.5px] text-gray-400 font-sans">{r.total_kg.toFixed(2)} kg total</div></td>
                  <td className="px-3 py-2 font-mono font-semibold text-gray-900">{r.stock.toFixed(3)}</td>
                  <td className="px-3 py-2 font-bold" style={{ color: r.signal_color }}>{r.days_cover !== null ? `${r.days_cover}d` : '—'}</td>
                  <td className="px-3 py-2"><span className={reorderSignalBadgeCls(r.signal)}>{r.signal}</span></td>
                  <td className="px-3 py-2 text-gray-500">{r.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
