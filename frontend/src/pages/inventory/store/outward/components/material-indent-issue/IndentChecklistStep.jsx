import { useState } from 'react'
import { Ban } from 'lucide-react'
import { Button, ConfirmModal, Modal } from '../../../../../../components/ui'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'
import { materialIndentApi } from '../../../../../../api/inventory.js'
import { humanQty, isCovered, roundQty } from '../../../../../../utils/qty.js'
import IndentIssuePanel from './IndentIssuePanel.jsx'
import { PRIORITY_META, fmtDate, requesterLabel } from '../../../material-indent/shared.js'

function RejectModal({ open, title, onClose, onConfirm }) {
  const [reason, setReason] = useState('')
  const [busy, setBusy]     = useState(false)
  const [err, setErr]       = useState('')
  const go = async () => {
    if (reason.trim().length < 3) { setErr('A reason of at least 3 characters is required.'); return }
    setBusy(true); setErr('')
    try { await onConfirm(reason.trim()); setReason('') }
    catch (e) { setErr(e?.response?.data?.error || e.message || 'Could not reject.') }
    finally { setBusy(false) }
  }
  return (
    <Modal open={open} onClose={onClose} size="sm">
      <div className="p-5">
        <h3 className="text-base font-bold text-gray-900 mb-2">{title}</h3>
        <textarea autoFocus className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm min-h-[80px] outline-none focus:border-red-400"
          placeholder="Reason for rejection…" value={reason} onChange={e => setReason(e.target.value)} />
        {err && <p className="text-xs text-red-600 mt-1">{err}</p>}
        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline-gray" onClick={onClose}>Cancel</Button>
          <Button variant="danger-solid" loading={busy} onClick={go}>Reject</Button>
        </div>
      </div>
    </Modal>
  )
}

export default function IndentChecklistStep({ indent, onChanged, onBack }) {
  const [activeId, setActiveId]   = useState(null)
  const [issueNonce, setNonce]    = useState(0)
  const [lineMsg, setLineMsg]     = useState({})
  const [rejectLineId, setRejectLineId] = useState(null)
  const [rejectAll, setRejectAll] = useState(false)

  const items      = indent.items || []
  const live       = items.filter(i => i.lineStatus !== 'REJECTED')
  const done       = live.filter(i => isCovered(i.requestedQty, i.issuedQty))
  const partial    = live.filter(i => i.issuedQty > 0 && !isCovered(i.requestedQty, i.issuedQty))
  const pending    = live.filter(i => !(i.issuedQty > 0))
  const progress   = live.length ? Math.round((done.length / live.length) * 100) : 0

  const issue = async (payload) => {
    const res = await materialIndentApi.issue(indent.id, payload)
    const shown = payload.displayQty != null
      ? `${roundQty(payload.displayQty)} ${(payload.displayUom || '').toUpperCase()}`
      : humanQty(payload.qty, '')
    setLineMsg(m => ({ ...m, [payload.itemId]: `Issued ${shown} from ${payload.source === 'pack' ? 'Pack' : 'Container'} ${payload.sourceId}` }))
    const fresh = res.data
    const freshLine = (fresh.items || []).find(i => i.id === payload.itemId)
    if (freshLine && isCovered(freshLine.requestedQty, freshLine.issuedQty)) setActiveId(null)
    else setNonce(n => n + 1) // remount the panel so it re-reads stock for the next scan
    onChanged(fresh)
  }

  const rejectLine = async (reason) => {
    const res = await materialIndentApi.rejectLine(indent.id, rejectLineId, { reason })
    setRejectLineId(null)
    onChanged(res.data)
  }
  const rejectWhole = async (reason) => {
    const res = await materialIndentApi.reject(indent.id, { reason })
    setRejectAll(false)
    onChanged(res.data)
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg font-bold text-gray-900 font-mono">{indent.indentNo}</h2>
            <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">{indent.departmentName}</span>
            <span className={`text-xs ${(PRIORITY_META[indent.priority] || {}).cls}`}>{indent.priority}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {requesterLabel(indent)} · {fmtDate(indent.submittedAt || indent.createdAt)}
            <span className="text-gray-400 ml-2">— {done.length}/{live.length} lines issued</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {indent.status !== 'COMPLETED' && (
            <Button variant="danger" size="sm" icon={Ban} onClick={() => setRejectAll(true)}>Reject Indent</Button>
          )}
        </div>
      </div>

      <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-2 sm:px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-700">{pending.length}</p><p className="text-xs text-gray-500">Pending</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-2 sm:px-4 py-3 text-center">
          <p className="text-2xl font-bold text-amber-700">{partial.length}</p><p className="text-xs text-amber-600">Partially Issued</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl px-2 sm:px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-700">{done.length}</p><p className="text-xs text-green-600">Fully Issued</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((line, idx) => {
          const rejected  = line.lineStatus === 'REJECTED'
          const remaining = Math.max(0, roundQty(line.requestedQty - line.issuedQty))
          const isDone    = !rejected && isCovered(line.requestedQty, line.issuedQty)
          const isActive  = activeId === line.id
          const isPartial = line.issuedQty > 0 && !isDone

          return (
            <div key={line.id} className={`border rounded-xl overflow-hidden transition-all ${
              rejected ? 'border-gray-200 bg-gray-50' :
              isDone   ? 'border-green-200 bg-green-50' :
              isActive ? 'border-indigo-400 bg-white shadow-sm' : 'border-gray-200 bg-white'
            }`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  rejected ? 'bg-gray-300 text-white' :
                  isDone   ? 'bg-green-500 text-white' :
                  isPartial ? 'bg-amber-400 text-white' : 'bg-gray-200 text-gray-600'
                }`}>{rejected ? '—' : isDone ? '✓' : idx + 1}</span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-semibold text-sm ${rejected ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{toTitleCase(line.itemName)}</span>
                    <span className="text-xs font-mono text-gray-400">{line.itemCode}</span>
                    {rejected && <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-600">Rejected</span>}
                  </div>
                  {!rejected && (
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span>Requested: <strong className="text-gray-800">{humanQty(line.requestedQty, line.uom)}</strong></span>
                      <span>Issued: <strong className={line.issuedQty > 0 ? 'text-green-700' : 'text-gray-400'}>{humanQty(line.issuedQty, line.uom)}</strong></span>
                      {!isDone && <span>Remaining: <strong className="text-red-600">{humanQty(remaining, line.uom)}</strong></span>}
                    </div>
                  )}
                  {line.remarks && !rejected && <p className="text-[11px] text-gray-400 mt-0.5">{line.remarks}</p>}
                  {line.lineRejectionReason && <p className="text-[11px] text-red-500 mt-0.5">Reason: {line.lineRejectionReason}</p>}
                  {lineMsg[line.id] && <p className="text-xs text-green-600 mt-0.5 font-medium">✓ {lineMsg[line.id]}</p>}
                </div>

                {!rejected && !isDone && (
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button className="text-xs font-semibold text-red-500 hover:text-red-700 px-2 py-1" onClick={() => setRejectLineId(line.id)}>Reject</button>
                    <Button onClick={() => setActiveId(isActive ? null : line.id)} variant={isActive ? 'secondary' : 'purple'} size="xs">
                      {isActive ? 'Close' : isPartial ? 'Issue More' : 'Issue →'}
                    </Button>
                  </div>
                )}
                {isDone && <span className="text-xs font-bold text-green-600 px-2.5 py-1 bg-green-100 rounded-lg flex-shrink-0">Done ✓</span>}
              </div>

              {isActive && !isDone && !rejected && (
                <IndentIssuePanel key={`${line.id}-${issueNonce}`} line={line} onIssue={issue} />
              )}
            </div>
          )
        })}
      </div>

      {progress === 100 && (
        <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
          <p className="text-2xl mb-2">🎉</p>
          <p className="font-bold text-green-800 text-lg">All lines issued — indent complete</p>
          {onBack && <Button onClick={onBack} variant="success" className="mt-4">Back to Open Indents</Button>}
        </div>
      )}

      <RejectModal open={!!rejectLineId} title="Reject this line" onClose={() => setRejectLineId(null)} onConfirm={rejectLine} />
      <RejectModal open={rejectAll} title={`Reject indent ${indent.indentNo}`} onClose={() => setRejectAll(false)} onConfirm={rejectWhole} />
    </div>
  )
}
