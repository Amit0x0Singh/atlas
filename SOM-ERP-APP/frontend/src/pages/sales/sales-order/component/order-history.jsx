import { COMPANIES, STATUS_STYLE, STATUS_LABELS } from '../shared/constants.js'
import { fmtDate, etdDays } from '../shared/utils.js'

// ─────────────────────────────────────────────────────────────────────────────
// OrderHistory
// Read-only tabular view of all orders. Search by customer or DI number,
// filter by company. Each row links to the dispatch modal via onOpenDispatch.
//
// Props:
//   orders          {array}   full orders list
//   loading         {bool}
//   search          {string}
//   onSearchChange  {fn}      (value: string) => void
//   filterCompany   {string}
//   onCompanyChange {fn}      (value: string) => void
//   onOpenDispatch  {fn}      (order) => void
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderHistory({
  orders, loading, search, onSearchChange,
  filterCompany, onCompanyChange, onOpenDispatch,
}) {
  const visible = orders.filter(o =>
    !search ||
    o.customerName.toLowerCase().includes(search.toLowerCase()) ||
    o.diNo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* ── Filter bar ────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Search customer or order…"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-green-500 focus:outline-none"
        />
        <select
          value={filterCompany}
          onChange={e => onCompanyChange(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
        >
          <option value="ALL">All Companies</option>
          {COMPANIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : visible.length === 0 ? (
        <div className="text-center py-16 text-gray-400">No orders found.</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-xs text-gray-500 font-semibold border-b border-gray-100"
                style={{ background: '#f8fdf8' }}
              >
                <th className="text-left px-4 py-3">DI No.</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="text-left px-4 py-3">Customer</th>
                <th className="text-left px-4 py-3">Products</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-right px-4 py-3">Qty</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">ETD</th>
                <th className="text-left px-4 py-3">Invoice</th>
                <th className="text-center px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map(order => {
                const days     = etdDays(order.estimatedDispatchDate)
                const overdue  = days !== null && days < 0
                const totalQty = order.items.reduce((n, it) => n + parseFloat(it.totalQty || 0), 0)
                return (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-green-50 transition">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{order.diNo}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(order.orderReceivedDate)}</td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{order.customerName}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {order.items.map(it => it.inhouseProductName).join(', ')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{order.orderType}</td>
                    <td className="px-4 py-3 text-right font-semibold text-xs">
                      {totalQty} {order.items[0]?.totalUom || 'KG'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLE[order.items[0]?.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[order.items[0]?.status] || order.items[0]?.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
                      {fmtDate(order.estimatedDispatchDate)}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{order.invoiceNo || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => onOpenDispatch(order)}
                        className="text-xs border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
