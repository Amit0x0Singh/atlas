import { Button } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import { RefreshCw } from 'lucide-react'

import { toTitleCase } from '../../../../../utils/textDisplay.js'
export default function PurchaseIndentTab({
  showSentPOs, setShowSentPOs, onRefresh, onGeneratePO,
  purchaseLoading, purchaseSummary, orderQtys, setOrderQtys,
}) {
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Purchase Indent</h2>
          <p className="text-sm text-gray-500">RM shortfall summary from all pending stock indents</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer">
            <input type="checkbox" checked={showSentPOs} onChange={e => setShowSentPOs(e.target.checked)} className="rounded" />
            Show already sent
          </label>
          <Button variant="outline-gray" icon={RefreshCw} size="sm" onClick={onRefresh}>Refresh</Button>
          {purchaseSummary.length > 0 && (
            <Can permission="production.indent.create">
              <Button variant="success" size="sm" onClick={onGeneratePO}>Generate PO</Button>
            </Can>
          )}
        </div>
      </div>
      {purchaseLoading ? <p className="text-gray-400">Loading...</p>
        : purchaseSummary.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400">
            <p className="text-lg">o. No purchase requirements</p>
            <p className="text-sm mt-1">All pending indents have sufficient stock</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="text-left px-4 py-3">#</th>
                  <th className="text-left px-4 py-3">Item</th>
                  <th className="text-left px-4 py-3">Code</th>
                  <th className="text-right px-4 py-3">Total Required</th>
                  <th className="text-right px-4 py-3">Available</th>
                  <th className="text-right px-4 py-3">Shortfall</th>
                  <th className="text-right px-4 py-3">Order Qty</th>
                  <th className="text-center px-4 py-3">PO Status</th>
                </tr>
              </thead>
              <tbody>
                {purchaseSummary.map((rm, i) => (
                  <tr key={rm.rmCode} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{toTitleCase(rm.rmName)}</div>
                      <div className="text-xs text-gray-400 mt-0.5">Used in: {rm.indents.map(x => x.productName).join(', ')}</div>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-blue-700">{rm.rmCode}</td>
                    <td className="px-4 py-3 text-right">{rm.totalRequired.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right text-green-700">{rm.availableQty.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right text-red-600 font-bold">{rm.shortfall.toFixed(3)}</td>
                    <td className="px-4 py-3 text-right">
                      <input type="number" step="0.001" min="0"
                        value={orderQtys[rm.rmCode] || ''}
                        onChange={e => setOrderQtys(q => ({ ...q, [rm.rmCode]: e.target.value }))}
                        className="w-28 border border-gray-300 rounded px-2 py-1 text-sm text-right outline-none focus:ring-2 focus:ring-blue-400" />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {rm.indents?.some(x => x.poSentAt) ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold">
                          o" Sent {new Date(rm.indents.find(x=>x.poSentAt)?.poSentAt).toLocaleDateString('en-IN')}
                        </span>
                      ) : <span className="text-xs text-gray-400">Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-4 py-3 bg-gray-50 border-t text-xs text-gray-500">
              Covering {purchaseSummary.flatMap(r => r.indents).filter((v, i, a) => a.findIndex(x => x.indentId === v.indentId) === i).length} pending indent(s)
            </div>
          </div>
        )
      }
    </div>
  )
}
