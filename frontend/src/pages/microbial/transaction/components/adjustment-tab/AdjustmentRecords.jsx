import { useMemo, useState } from 'react'
import { Search, TrendingDown } from 'lucide-react'
import { useMicrobialAdjustments } from '../../../../../hooks/microbial/useMicrobialAdjustment.js'
import { useUserDisplayNames } from '../../../../../hooks/masters/useUserDisplayNames.js'
import { fmtCfu, fmtDateTime } from '../../utils/format.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { REASON_LABEL } from './reasons.js'

const TH = 'px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 whitespace-nowrap'
const TD = 'px-3 py-2.5 text-xs text-slate-700 align-top'

export default function AdjustmentRecords() {
  const displayName = useUserDisplayNames()
  const { data: rows = [], isLoading } = useMicrobialAdjustments()
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter((a) =>
      a.microbe_name?.toLowerCase().includes(q) ||
      a.microbe_code?.toLowerCase().includes(q) ||
      a.container_code?.toLowerCase().includes(q) ||
      a.location?.toLowerCase().includes(q) ||
      a.batch_code?.toLowerCase().includes(q) ||
      a.remarks?.toLowerCase().includes(q),
    )
  }, [rows, search])

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">Stock Loss Adjustment Records</h3>
        <p className="text-xs text-slate-500">Every booked stock loss against a microbial SFG batch.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
          <div className="relative min-w-[220px] flex-1">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search microbe, container, batch, remarks…"
              className="w-full rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-[13px] outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
            />
          </div>
          <span className="text-xs font-medium text-slate-400">
            {filtered.length} record{filtered.length === 1 ? '' : 's'}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-slate-300">
              <TrendingDown size={18} />
            </div>
            <p className="text-sm text-slate-400">
              {search ? 'No records match your search.' : 'No stock loss adjustments recorded yet.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px] border-collapse">
              <thead className="bg-slate-50">
                <tr>
                  <th className={TH}>Date</th>
                  <th className={TH}>Microbe</th>
                  <th className={TH}>Container</th>
                  <th className={TH}>Location</th>
                  <th className={TH}>Batch</th>
                  <th className={TH}>Reason</th>
                  <th className={`${TH} text-right`}>Loss (kg)</th>
                  <th className={`${TH} text-right`}>Balance After</th>
                  <th className={TH}>CFU/g</th>
                  <th className={TH}>Remarks</th>
                  <th className={TH}>Created By</th>
                  <th className={TH}>Updated By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.adjustment_id} className="hover:bg-slate-50/60">
                    <td className={`${TD} whitespace-nowrap`}>{fmtDateTime(a.created_at)}</td>
                    <td className={TD}>
                      <div className="font-semibold text-slate-900">{toTitleCase(a.microbe_name)}</div>
                      <div className="text-[11px] text-slate-400">{a.microbe_code}</div>
                    </td>
                    <td className={`${TD} font-mono`}>{a.container_code}</td>
                    <td className={`${TD} font-mono`}>{a.location || '—'}</td>
                    <td className={`${TD} font-mono`}>{a.batch_code || '—'}</td>
                    <td className={TD}>
                      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-200">
                        {REASON_LABEL[a.reason_category] || a.reason_category}
                      </span>
                    </td>
                    <td className={`${TD} text-right font-bold text-rose-600`}>−{Number(a.loss_qty_kg).toFixed(3)}</td>
                    <td className={`${TD} text-right`}>{Number(a.balance_after_kg).toFixed(3)}</td>
                    <td className={TD}>{fmtCfu(a.cfu_per_g_at_adjust)}</td>
                    <td className={`${TD} max-w-[200px]`}>{a.remarks || '—'}</td>
                    <td className={`${TD} whitespace-nowrap`}>{toTitleCase(displayName(a.created_by)) || '—'}</td>
                    <td className={`${TD} whitespace-nowrap`}>{toTitleCase(displayName(a.updated_by)) || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
