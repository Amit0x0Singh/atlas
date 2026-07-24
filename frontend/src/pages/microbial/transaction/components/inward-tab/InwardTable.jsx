import { fillBadgeCls, statusBadgeCls, fmtCfu, fmtDate } from '../../utils/format.js'

export default function InwardTable({ rows, loading }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-gray-700">Recent Inward Entries</h3>
        <span className="text-xs text-gray-400">See Transaction History for the full record</span>
      </div>

      {loading ? (
        <p className="text-center py-10 text-gray-400">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-2">📦</div>
          <p className="text-sm">No inward records found. Add an entry or import from Excel.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                {['Microbe', 'Container', 'Type', 'Batch Code', 'Harvest Date', 'Total (kg)', 'Remaining (kg)', 'CFU/g', 'Location', 'Fill', 'Status'].map((h) => (
                  <th key={h} className="text-left px-3 py-2.5 font-bold text-gray-500 uppercase tracking-wide bg-gray-50 border-b-2 border-gray-200 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.inward_id} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-3 py-2.5 border-b border-gray-100 font-semibold text-gray-900">
                    {r.microbe_name}
                    <div className="text-[10px] text-gray-400 font-normal">{r.microbe_code}</div>
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 font-mono text-gray-700">{r.container_code}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-gray-700">{r.microbe_type}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 font-mono text-gray-700">{r.biomass_batch_code}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-gray-700">{fmtDate(r.date_of_harvest)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 font-semibold text-gray-900">{Number(r.total_qty_kg).toFixed(3)}</td>
                  <td className={`px-3 py-2.5 border-b border-gray-100 font-bold ${Number(r.remaining_qty_kg) > 0 ? 'text-green-700' : 'text-red-600'}`}>
                    {Number(r.remaining_qty_kg).toFixed(3)}
                  </td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-gray-700">{fmtCfu(r.inhouse_cfu_per_g)}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100 text-gray-700">{r.location || '—'}</td>
                  <td className="px-3 py-2.5 border-b border-gray-100"><span className={fillBadgeCls(r.fill_status)}>{r.fill_status}</span></td>
                  <td className="px-3 py-2.5 border-b border-gray-100"><span className={statusBadgeCls(r.status)}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
