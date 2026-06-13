import { useState, Fragment } from 'react'
import { STATUS_STYLE, STATUS_LABELS } from '../shared/constants.js'
import { fmtDate, etdDays } from '../shared/utils.js'

const TOGGLE_BTN = (active) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: '5px',
  padding: '4px 10px',
  background: active ? '#f0fdf4' : '#f8fafc',
  color: active ? '#15803d' : '#64748b',
  border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}`,
  borderRadius: '6px',
  fontSize: '11px',
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
})

const TH_INNER = {
  textAlign: 'left',
  padding: '6px 12px',
  color: '#64748b',
  fontWeight: 700,
  fontSize: '10px',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
}

export default function OrderHistory({ orders, loading, onOpenDispatch }) {
  const [expandedIds, setExpandedIds] = useState(new Set())

  const toggle = (id) =>
    setExpandedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  if (loading)
    return <div className="text-center py-16 text-gray-400">Loading…</div>

  if (!orders.length)
    return (
      <div className="text-center py-16 text-gray-400">
        <div className="text-5xl mb-3">📋</div>
        <p className="font-medium">No orders found</p>
        <p className="text-sm mt-1">Try clearing the filters</p>
      </div>
    )

  return (
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
            <th className="text-left px-4 py-3">Type</th>
            <th className="text-right px-4 py-3">Total Qty</th>
            <th className="text-left px-4 py-3">ETD</th>
            <th className="text-left px-4 py-3">Invoice</th>
            <th className="text-left px-4 py-3">Items</th>
            <th className="text-center px-4 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => {
            const days = etdDays(order.estimatedDispatchDate)
            const overdue = days !== null && days < 0
            const totalQty = order.items.reduce(
              (n, it) => n + parseFloat(it.totalQty || 0),
              0,
            )
            const expanded = expandedIds.has(order.id)

            return (
              <Fragment key={order.id}>
                {/* ── Main row ── */}
                <tr className="border-b border-gray-50 hover:bg-green-50 transition">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">
                    {order.diNo}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {fmtDate(order.orderReceivedDate)}
                  </td>
                  <td className="px-4 py-3 font-semibold text-gray-800">
                    {order.customerName}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.orderType}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-xs">
                    {totalQty} {order.items[0]?.totalUom || 'KG'}
                  </td>
                  <td
                    className={`px-4 py-3 text-xs ${
                      overdue ? 'text-red-500 font-semibold' : 'text-gray-500'
                    }`}
                  >
                    {fmtDate(order.estimatedDispatchDate)}
                    {days !== null &&
                      (overdue
                        ? ` (${Math.abs(days)}d overdue)`
                        : days <= 7 && days >= 0
                          ? ` (${days}d)`
                          : '')}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {order.invoiceNo || '—'}
                  </td>

                  {/* Items toggle */}
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggle(order.id)}
                      style={TOGGLE_BTN(expanded)}
                    >
                      {expanded ? '▲' : '▼'} {order.items.length} item
                      {order.items.length !== 1 ? 's' : ''}
                    </button>
                  </td>

                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => onOpenDispatch(order)}
                      className="text-xs border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50"
                    >
                      Edit
                    </button>
                  </td>
                </tr>

                {/* ── Expandable items sub-row ── */}
                {expanded && (
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={9} style={{ padding: '0 20px 12px' }}>
                      <div
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          marginTop: '6px',
                        }}
                      >
                        <table
                          style={{
                            width: '100%',
                            borderCollapse: 'collapse',
                          }}
                        >
                          <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                              <th style={TH_INNER}>Product</th>
                              <th style={{ ...TH_INNER, textAlign: 'right' }}>Qty</th>
                              <th style={TH_INNER}>Packing</th>
                              <th style={TH_INNER}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((it, idx) => (
                              <tr
                                key={it.id || idx}
                                style={{
                                  borderTop: '1px solid #e2e8f0',
                                  background: idx % 2 === 0 ? '#fff' : '#fafafa',
                                }}
                              >
                                <td
                                  style={{
                                    padding: '8px 12px',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#1e293b',
                                  }}
                                >
                                  {it.inhouseProductName || '—'}
                                  {it.customerProductName &&
                                    it.customerProductName !== it.inhouseProductName && (
                                      <span
                                        style={{
                                          marginLeft: '6px',
                                          fontSize: '10px',
                                          color: '#94a3b8',
                                          fontWeight: 400,
                                        }}
                                      >
                                        ({it.customerProductName})
                                      </span>
                                    )}
                                </td>
                                <td
                                  style={{
                                    padding: '8px 12px',
                                    textAlign: 'right',
                                    fontSize: '12px',
                                    fontWeight: 600,
                                    color: '#475569',
                                  }}
                                >
                                  {it.totalQty} {it.totalUom}
                                </td>
                                <td
                                  style={{
                                    padding: '8px 12px',
                                    fontSize: '11px',
                                    color: '#64748b',
                                  }}
                                >
                                  {[it.unitPackType, it.packingType]
                                    .filter(Boolean)
                                    .join(' / ') || '—'}
                                </td>
                                <td style={{ padding: '8px 12px' }}>
                                  <span
                                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                      STATUS_STYLE[it.status] ||
                                      'bg-gray-100 text-gray-600'
                                    }`}
                                  >
                                    {STATUS_LABELS[it.status] || it.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
