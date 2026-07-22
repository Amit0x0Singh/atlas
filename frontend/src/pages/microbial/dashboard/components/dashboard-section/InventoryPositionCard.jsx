import { stockStatusBadgeCls, fmtDate } from '../../../transaction/utils/format.js'

export default function InventoryPositionCard({ rows, onViewFull }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 bg-gray-900 text-white text-xs font-bold flex items-center justify-between">
        <span>🧬 Inventory Position</span>
        <button type="button" className="text-white/90 underline text-[11px] font-normal" onClick={onViewFull}>Top 10 by balance · Full ledger →</button>
      </div>
      {!rows.length ? (
        <div className="text-center py-8 text-gray-400 text-xs">No stock recorded yet</div>
      ) : (
        <table className="w-full text-xs">
          <thead><tr>{['Microbe', 'Code', 'Balance (kg)', 'Containers', 'Next Expiry', 'Status'].map((h) => <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase bg-gray-50 border-b-2 border-gray-200">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.microbe_code} className="border-b border-gray-100">
                <td className="px-3 py-2 font-semibold text-gray-900">{r.microbe_name}</td>
                <td className="px-3 py-2"><span className="font-mono text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{r.microbe_code}</span></td>
                <td className="px-3 py-2 font-bold text-gray-900">{r.balance_kg.toFixed(3)}</td>
                <td className="px-3 py-2 text-gray-600">{r.containers}</td>
                <td className="px-3 py-2 text-gray-600">{fmtDate(r.next_expiry)}</td>
                <td className="px-3 py-2"><span className={stockStatusBadgeCls(r.status)}>{r.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
