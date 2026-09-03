import { Modal } from '../../../../../components/ui'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { LINE_STATUS_META, PRIORITY_META, statusPill, fmtDate, fmtNum, requesterLabel } from '../shared.js'

function KV({ k, children }) {
  return (
    <div>
      <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{k}</div>
      <div className="text-sm text-gray-900 font-medium">{children}</div>
    </div>
  )
}

export default function IndentDetailModal({ indent, open, onClose }) {
  if (!indent) return null
  const s = statusPill(indent.status)

  return (
    <Modal open={open} onClose={onClose} size="full">
      <div className="p-5 md:p-6">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{indent.indentNo || 'Draft Indent'}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Raised {fmtDate(indent.submittedAt || indent.createdAt)}</p>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${s.cls}`}>{s.label}</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <KV k="Department">{indent.departmentName}</KV>
          <KV k="Priority"><span className={(PRIORITY_META[indent.priority] || {}).cls}>{indent.priority}</span></KV>
          <KV k="Requested By">{requesterLabel(indent)}</KV>
          {indent.criticalReason && <div className="col-span-2 md:col-span-4"><KV k="Critical Reason">{indent.criticalReason}</KV></div>}
          {indent.overallRemarks && <div className="col-span-2 md:col-span-4"><KV k="Overall Remarks"><span className="font-normal">{indent.overallRemarks}</span></KV></div>}
          {indent.rejectionReason && (
            <div className="col-span-2 md:col-span-4">
              <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
                <span className="font-bold">Rejected:</span> {indent.rejectionReason}
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-[11px] uppercase tracking-wide text-gray-400">
              <tr>
                <th className="text-left font-bold px-3 py-2">Item</th>
                <th className="text-right font-bold px-3 py-2">Requested</th>
                <th className="text-right font-bold px-3 py-2">Issued</th>
                <th className="text-right font-bold px-3 py-2">Pending</th>
                <th className="text-left font-bold px-3 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {(indent.items || []).map(it => {
                const ls = LINE_STATUS_META[it.lineStatus] || LINE_STATUS_META.PENDING
                const uom = (it.uom || '').toUpperCase()
                const pending = it.pendingQty ?? Math.max(0, it.requestedQty - it.issuedQty)
                return (
                  <tr key={it.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">
                      <div className="font-medium text-gray-900">{toTitleCase(it.itemName)}</div>
                      <div className="text-[11px] font-mono text-gray-400">{it.itemCode}</div>
                      {it.remarks && <div className="text-[11px] text-gray-400 mt-0.5">{it.remarks}</div>}
                      {it.lineRejectionReason && <div className="text-[11px] text-red-500 mt-0.5">Rejected: {it.lineRejectionReason}</div>}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold whitespace-nowrap">{fmtNum(it.requestedQty)} <span className="text-[11px] font-normal text-gray-400">{uom}</span></td>
                    <td className="px-3 py-2 text-right text-green-700 whitespace-nowrap">{fmtNum(it.issuedQty)} <span className="text-[11px] font-normal text-green-600/60">{uom}</span></td>
                    <td className="px-3 py-2 text-right text-red-600 whitespace-nowrap">{fmtNum(pending)} <span className="text-[11px] font-normal text-red-400">{uom}</span></td>
                    <td className="px-3 py-2"><span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ls.cls}`}>{ls.label}</span></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </Modal>
  )
}
