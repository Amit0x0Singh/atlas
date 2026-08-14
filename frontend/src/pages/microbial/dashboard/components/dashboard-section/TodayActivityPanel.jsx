import { fmtCfu } from '../../../transaction/utils/format.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

export default function TodayActivityPanel({ todayInward, todayIssued }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-teal-700 text-white text-xs font-bold">📥 Today Inward</div>
        {!todayInward.length ? (
          <div className="text-center py-8 text-gray-400 text-xs">No inward today</div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr>{['Container', 'Microbe', 'CFU/g', 'Qty (kg)', 'Location'].map((h) => <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase bg-gray-50 border-b-2 border-gray-200">{h}</th>)}</tr></thead>
            <tbody>
              {todayInward.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-gray-700">{r.container_code}</td>
                  <td className="px-3 py-2 text-gray-800">{toTitleCase(r.microbe_name)}</td>
                  <td className="px-3 py-2 text-gray-600">{fmtCfu(r.cfu_per_g)}</td>
                  <td className="px-3 py-2 font-bold text-gray-900">{Number(r.qty_kg).toFixed(4)}</td>
                  <td className="px-3 py-2 text-gray-500">{toTitleCase(r.location) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 bg-amber-700 text-white text-xs font-bold">📤 Today Issued</div>
        {!todayIssued.length ? (
          <div className="text-center py-8 text-gray-400 text-xs">No issuances today</div>
        ) : (
          <table className="w-full text-xs">
            <thead><tr>{['Container', 'Microbe', 'Qty (kg)', 'Product', 'Customer'].map((h) => <th key={h} className="text-left px-3 py-2 font-bold text-gray-500 uppercase bg-gray-50 border-b-2 border-gray-200">{h}</th>)}</tr></thead>
            <tbody>
              {todayIssued.map((r, i) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="px-3 py-2 font-mono text-gray-700">{r.container_code}</td>
                  <td className="px-3 py-2 text-gray-800">{toTitleCase(r.microbe_name)}</td>
                  <td className="px-3 py-2 font-bold text-red-600">{Number(r.qty_kg).toFixed(4)}</td>
                  <td className="px-3 py-2 text-gray-600">{toTitleCase(r.product_name) || '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{toTitleCase(r.customer_name) || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
