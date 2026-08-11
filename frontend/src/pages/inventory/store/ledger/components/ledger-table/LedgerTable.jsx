import './LedgerTable.css'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

const TX_COLORS = {
  INWARD:            'bg-green-100 text-green-800',
  BOM_ISSUANCE:      'bg-blue-100 text-blue-800',
  PACK_TO_CONTAINER: 'bg-purple-100 text-purple-800',
  STOCK_RECON:       'bg-orange-100 text-orange-800',
}

export default function LedgerTable({ loading, rows, onOpenDetail }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-800 text-white">
            <tr>
              <th className="text-left px-4 py-3">Date & Time</th>
              <th className="text-left px-4 py-3">Item Name</th>
              <th className="text-left px-4 py-3">Transaction</th>
              <th className="text-right px-4 py-3">Qty</th>
              <th className="text-left px-4 py-3">Reference</th>
              <th className="px-4 py-3 text-center">Detail</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">Loading...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-8 text-gray-400">No transactions found</td></tr>
            ) : rows.map(row => {
              const isIn  = row.inQty  > 0
              const isOut = row.outQty > 0
              const invQty = isIn ? row.inQty : row.outQty
              // BOM issuance rows carry the item's Operational UOM qty
              // alongside the Inventory UOM deduction (outQty) — shown as
              // the primary figure with the inventory-uom amount as a
              // "(X deducted)" note underneath, same convention Store
              // Outward's Recent Transactions table uses, so the two views
              // read as one consistent number instead of two disagreeing ones.
              const showOperational = row.operationalUom && Number(row.operationalQty) !== Number(invQty)
              const sign = isIn ? '+' : isOut ? '−' : ''
              const color = isIn ? 'text-green-600' : isOut ? 'text-red-600' : 'text-gray-400'
              const qty = !isIn && !isOut
                ? <span className="text-gray-400">—</span>
                : (
                  <span className={`font-semibold ${color}`}>
                    {showOperational
                      ? <>{sign}{Number(row.operationalQty).toFixed(3)} {row.operationalUom}</>
                      : <>{sign}{Number(invQty).toFixed(3)} {row.uom || ''}</>}
                    {showOperational && (
                      <div className="text-[10px] font-normal text-gray-400">
                        ({Number(invQty).toFixed(3)} {row.uom || ''} deducted)
                      </div>
                    )}
                  </span>
                )
              return (
                <tr key={row.id} className="border-b border-gray-100 hover:bg-blue-50 transition cursor-pointer"
                  onClick={() => onOpenDetail(row)}>
                  <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                    {new Date(row.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}
                  </td>
                  <td className="px-4 py-2.5 text-sm font-medium text-gray-800">{toTitleCase(row.itemName) || row.itemCode}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TX_COLORS[row.transactionType] || 'bg-gray-100 text-gray-600'}`}>
                      {row.transactionType.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">{qty}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs truncate">{row.reference || '—'}</td>
                  <td className="px-4 py-2.5 text-center text-blue-400 hover:text-blue-600">🔍</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
