import { Loader2, FlaskConical, PlayCircle, Trash2, Inbox, X } from 'lucide-react'
import { Button, IconButton } from '../../../../../components/ui'
import { fmtDate } from '../../utils/format.js'

export default function PendingIssuancesModal({ open, onClose, sessions, loadingSessions, onResumeSession, onDiscardSession }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Pending Issuances</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Opened but not confirmed yet — pick up exactly where you left off, or discard to free the task back up.
            </p>
          </div>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loadingSessions ? (
            <div className="py-10 text-center text-gray-400">
              <Loader2 size={20} className="animate-spin mx-auto mb-2" />
              Loading…
            </div>
          ) : sessions.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-8 text-center">
              <Inbox size={24} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">No pending issuances</p>
              <p className="text-xs text-gray-400 mt-1">Everything you've opened has been confirmed or discarded.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((s) => (
                <div key={s.id} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-amber-100 text-amber-700">
                      <FlaskConical size={16} />
                    </span>
                    <div className="min-w-0">
                      <div className="font-semibold text-gray-900 text-sm truncate">{s.header?.product_name || 'Untitled issuance'}</div>
                      <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                        {s.header?.batch_code && <span className="font-mono">{s.header.batch_code}</span>}
                        {s.header?.di_number && <span>{s.header.di_number}</span>}
                        <span>{(s.rows || []).length} microbe{(s.rows || []).length !== 1 ? 's' : ''}</span>
                        <span>saved {fmtDate(s.updated_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button type="button" variant="primary" size="xs" icon={PlayCircle} onClick={() => { onResumeSession(s); onClose() }}>Resume</Button>
                    <button type="button" onClick={() => onDiscardSession(s)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Discard this issuance">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
