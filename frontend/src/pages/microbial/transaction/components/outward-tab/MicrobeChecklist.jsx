import { ChevronDown, ChevronRight, CheckCircle2 } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { PLANT_BADGE } from '../../../../production/planning/data/plantConfig.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { fmtCfu, microbeProgress } from '../../utils/format.js'
import RequirementRow from './RequirementRow.jsx'

const STATUS = {
  pending: { label: 'Pending', cls: 'bg-gray-100 text-gray-600' },
  partial: { label: 'Partial', cls: 'bg-amber-100 text-amber-700' },
  issued:  { label: 'Issued',  cls: 'bg-green-100 text-green-700' },
}
const rowStatus = (p) => (p.done ? 'issued' : p.started ? 'partial' : 'pending')

export default function MicrobeChecklist({
  header, onHeaderField, selectedTask, rows, completed,
  activeRowId, calculatingId, issuingId,
  onToggleRow, onCalculate, onIssueMicrobe,
  onAllocationQtyChange, onAllocationRemove, onAllocationChange, onAddBatch, onBack,
}) {
  const receiverFilled = !!header.receiver_name?.trim()
  const progs = rows.map((r) => ({ row: r, p: microbeProgress(r) }))
  const total = rows.length
  const done = progs.filter((x) => x.p.done).length
  const partial = progs.filter((x) => !x.p.done && x.p.started).length
  const pending = total - done - partial
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  const smallField = 'w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900">{toTitleCase(header.product_name) || 'Microbe Issuance'}</h3>
              {selectedTask?.plant && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PLANT_BADGE[selectedTask.plant] || 'bg-gray-100 text-gray-600'}`}>{selectedTask.plant}</span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
              {header.order_qty_kg && <span className="font-medium text-gray-600">{header.order_qty_kg} KG batch</span>}
              {header.batch_code && <span className="font-mono">{header.batch_code}</span>}
              {header.di_number && <span>{header.di_number}</span>}
              {selectedTask && <span>Task {selectedTask.taskId || selectedTask.id}</span>}
            </div>
          </div>
        </div>

        {/* Progress */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>{done}/{total} microbes issued{completed ? '' : ' · progress auto-saved'}</span>
            {completed && <span className="text-green-600 font-bold">All done</span>}
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>

        {/* Section (the plant badge next to the product name above, already
            sourced from the task) and Issuer (whoever is logged in — no
            need to name yourself) are both captured silently in the
            background and sent with the issuance, with nothing to show or
            type here. Receiver Name is the only field that still needs a
            human answer, since the system has no way to know who's on the
            other end — and issuing stays blocked until it's filled in. */}
        <div className="max-w-xs mt-4">
          <label className="block text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Receiver Name *</label>
          <input
            className={`${smallField} ${!receiverFilled ? 'border-red-300 focus:ring-red-400' : ''}`}
            placeholder="Who is receiving this microbe?"
            value={header.receiver_name}
            onChange={(e) => onHeaderField('receiver_name', e.target.value)}
          />
          {!receiverFilled && <p className="text-[10px] text-red-500 mt-1">Required before any microbe can be issued.</p>}
        </div>
      </div>

      {/* Status tiles */}
      <div className="grid grid-cols-3 gap-px bg-gray-100 border-b border-gray-100">
        {[['Pending', pending, 'text-gray-700'], ['Partial', partial, 'text-amber-700'], ['Issued', done, 'text-green-700']].map(([label, n, cls]) => (
          <div key={label} className="bg-white px-4 py-3 text-center">
            <p className={`text-xl font-bold ${cls}`}>{n}</p>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {completed ? (
        <div className="px-5 py-10 text-center">
          <CheckCircle2 size={32} className="mx-auto text-green-500 mb-2" />
          <p className="text-sm font-semibold text-gray-900">All microbes issued for this task</p>
          <p className="text-xs text-gray-400 mt-1">The task is marked complete and moves to Outward History.</p>
          <Button type="button" variant="primary" size="sm" className="mt-4" onClick={onBack}>Back</Button>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {progs.map(({ row, p }) => {
            const st = STATUS[rowStatus(p)]
            const open = activeRowId === row.id
            return (
              <div key={row.id}>
                <button
                  type="button"
                  onClick={() => !p.done && onToggleRow(row.id)}
                  className={`w-full text-left px-5 py-3 flex items-start gap-3 transition-colors ${
                    p.done ? 'cursor-default' : open ? 'bg-blue-50/60' : 'hover:bg-gray-50'
                  }`}
                >
                  {p.done
                    ? <CheckCircle2 size={16} className="text-green-500 mt-0.5 shrink-0" />
                    : open ? <ChevronDown size={16} className="text-gray-400 mt-0.5 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold text-gray-900 truncate">
                        {toTitleCase(row.microbe_name)} <span className="text-gray-400 font-mono text-xs">({row.microbe_code})</span>
                      </div>
                      <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${st.cls}`}>{st.label}</span>
                    </div>
                    <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 flex-wrap text-[11px] text-gray-400">
                      <span>Required <b className="text-gray-600">{fmtCfu(p.requiredCfu)}</b></span>
                      <span>Issued <b className={p.started ? 'text-green-700' : 'text-gray-500'}>{fmtCfu(p.issuedCfu)}</b> ({p.issuedKg.toFixed(3)} kg)</span>
                      {!p.done && <span>Remaining <b className="text-amber-700">{fmtCfu(p.remainingCfu)}</b> (≈ {p.remainingKgEq.toFixed(3)} kg)</span>}
                    </div>
                  </div>
                </button>

                {open && !p.done && (
                  <RequirementRow
                    row={row}
                    progress={p}
                    calculating={calculatingId === row.id}
                    issuing={issuingId === row.id}
                    receiverFilled={receiverFilled}
                    onCalculate={() => onCalculate(row)}
                    onIssue={() => onIssueMicrobe(row.id)}
                    onAllocationQtyChange={(inwardId, val) => onAllocationQtyChange(row.id, inwardId, val)}
                    onAllocationRemove={(inwardId) => onAllocationRemove(row.id, inwardId)}
                    onAllocationChange={(inwardId) => onAllocationChange(row.id, inwardId)}
                    onAddBatch={() => onAddBatch(row.id)}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
