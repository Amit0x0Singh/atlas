import { useMemo, useState } from 'react'
import {
  X, Check, Package, FlaskConical, Beaker,
  AlertTriangle, CheckCircle2, Search,
} from 'lucide-react'
import { Button, IconButton } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import { useMicrobeSuggestions } from '../../../../../hooks/masters/useMicrobes.js'
import { useSfgContainersByMicrobe } from '../../../../../hooks/microbial/useMicrobialInward.js'
import { useContainerBatches } from '../../../../../hooks/microbial/useMicrobialStorage.js'
import { useCreateAdjustment } from '../../../../../hooks/microbial/useMicrobialAdjustment.js'
import { fmtCfu, fmtDate, fillBadgeCls, statusBadgeCls } from '../../utils/format.js'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import MicrobeAutocomplete from '../shared/MicrobeAutocomplete.jsx'
import { REASON_CATEGORIES } from './reasons.js'

const INPUT =
  'w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30'
const LABEL = 'block text-[13px] font-semibold text-slate-700 mb-1.5'

/* ── Step shell ─────────────────────────────────────────────────────────── */
function Step({ n, title, state, summary, onChange, children }) {
  // state: 'active' | 'done' | 'pending'
  const badge =
    state === 'done'
      ? 'bg-emerald-100 text-emerald-700'
      : state === 'active'
        ? 'bg-rose-600 text-white'
        : 'bg-slate-100 text-slate-400'
  return (
    <section
      className={`rounded-xl border bg-white transition-shadow ${
        state === 'active' ? 'border-slate-300 shadow-sm' : 'border-slate-200'
      } ${state === 'pending' ? 'opacity-60' : ''}`}
    >
      <header className="flex items-center gap-3 px-4 py-3.5 sm:px-5">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold ${badge}`}>
          {state === 'done' ? <Check size={14} strokeWidth={3} /> : n}
        </span>
        <h3 className="flex-1 text-sm font-semibold text-slate-900">{title}</h3>
        {state === 'done' && summary != null && (
          <span className="hidden max-w-[45%] truncate text-xs font-medium text-slate-500 sm:block">{summary}</span>
        )}
        {state === 'done' && onChange && (
          <button
            type="button"
            onClick={onChange}
            className="shrink-0 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
          >
            Change
          </button>
        )}
      </header>
      {state !== 'done' && <div className="border-t border-slate-100 p-4 sm:p-5">{children}</div>}
      {state === 'done' && summary != null && (
        <div className="border-t border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500 sm:hidden">{summary}</div>
      )}
    </section>
  )
}

export default function AdjustmentTab() {
  const { data: microbes = [] } = useMicrobeSuggestions()
  const createAdjustment = useCreateAdjustment()

  const [microbe, setMicrobe] = useState(null)
  const [containerFilter, setContainerFilter] = useState('')
  const [container, setContainer] = useState(null)
  const [batch, setBatch] = useState(null)

  const [lossQty, setLossQty] = useState('')
  const [reasonCategory, setReasonCategory] = useState('')
  const [remarks, setRemarks] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const { data: containers = [], isLoading: loadingContainers } = useSfgContainersByMicrobe(microbe?.microbeCode, !!microbe)
  const { data: batches = [], isLoading: loadingBatches } = useContainerBatches(container?.container_id, !!container)

  const shownContainers = useMemo(() => {
    const q = containerFilter.trim().toLowerCase()
    const list = q ? containers.filter((c) => c.container_code?.toLowerCase().includes(q)) : containers
    return [...list].sort((a, b) => (a.container_code || '').localeCompare(b.container_code || ''))
  }, [containers, containerFilter])

  const maxQty = batch ? Number(batch.remaining_qty_kg) : 0
  const lossNum = parseFloat(lossQty)
  const lossValid = !isNaN(lossNum) && lossNum > 0 && lossNum <= maxQty + 0.0001
  const batchSelectable = (b) => b.status === 'ACTIVE' && Number(b.remaining_qty_kg) > 0.0001

  const resetForm = () => {
    setLossQty(''); setReasonCategory(''); setRemarks(''); setError(''); setSuccess('')
  }
  const pickMicrobe = (m) => { setMicrobe(m); setContainer(null); setBatch(null); setContainerFilter(''); resetForm() }
  const pickContainer = (c) => { setContainer(c); setBatch(null); resetForm() }
  const pickBatch = (b) => { setBatch(b); resetForm() }

  const submit = async () => {
    setError(''); setSuccess('')
    if (!batch) { setError('Select the batch the loss occurred in'); return }
    if (!lossValid) { setError(`Enter a valid loss quantity (max ${maxQty.toFixed(3)} kg)`); return }
    if (!reasonCategory) { setError('Select a reason'); return }

    try {
      const r = await createAdjustment.mutateAsync({
        inward_id: batch.inward_id,
        loss_qty_kg: lossNum,
        reason_category: reasonCategory,
        remarks: remarks.trim() || undefined,
      })
      const statusPart = r.new_status ? ` · batch is now ${r.new_status}` : ''
      const msg = `Recorded −${lossNum.toFixed(3)} kg against ${batch.container_code} / ${batch.biomass_batch_code}. ` +
        `${Number(r.new_remaining).toFixed(3)} kg remaining${statusPart}.`
      setBatch(null)
      resetForm()
      setSuccess(msg)
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Failed to record the adjustment.')
    }
  }

  const micState = microbe ? 'done' : 'active'
  const contState = !microbe ? 'pending' : container ? 'done' : 'active'
  const batchState = !container ? 'pending' : batch ? 'done' : 'active'

  return (
    <div className="w-full">
      <div className="mb-4">
        <h3 className="text-base font-bold text-slate-900">Stock Loss Adjustment</h3>
        <p className="text-xs text-slate-500">
          Book biomass lost during issuance, release to production, or transport between storage locations.
        </p>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> <span>{success}</span>
        </div>
      )}

      <div className="max-w-2xl">
        <div className="space-y-4">
          {/* Step 1 — microbe */}
          <Step
            n={1}
            title="Microbe"
            state={micState}
            summary={microbe ? `${toTitleCase(microbe.microbeName)} · ${microbe.microbeCode}` : null}
            onChange={() => pickMicrobe(null)}
          >
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-slate-400" />
              <div className="[&_input]:!pl-9">
                <MicrobeAutocomplete
                  value={microbe?.microbeName || ''}
                  microbes={microbes}
                  onSelect={pickMicrobe}
                  placeholder="Search microbe by name or code…"
                />
              </div>
            </div>
          </Step>

          {/* Step 2 — container */}
          {microbe && (
            <Step
              n={2}
              title="Container"
              state={contState}
              summary={container ? `${container.container_code} · ${container.location || 'no slot'}` : null}
              onChange={() => pickContainer(null)}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-slate-500">
                  {containers.length} container{containers.length === 1 ? '' : 's'} holding {toTitleCase(microbe.microbeName)}
                </span>
                {containers.length > 4 && (
                  <div className="relative">
                    <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={containerFilter}
                      onChange={(e) => setContainerFilter(e.target.value)}
                      placeholder="Filter code…"
                      className="w-36 rounded-lg border border-slate-300 py-1.5 pl-7 pr-2 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                    />
                  </div>
                )}
              </div>
              {loadingContainers ? (
                <SkeletonRows />
              ) : shownContainers.length === 0 ? (
                <EmptyLine icon={Package} text="No containers found for this microbe." />
              ) : (
                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                  {shownContainers.map((c) => {
                    const sel = container?.container_id === c.container_id
                    return (
                      <button
                        type="button"
                        key={c.container_id}
                        onClick={() => pickContainer(c)}
                        className={`group relative flex items-start justify-between gap-2 rounded-xl border p-3 text-left transition ${
                          sel
                            ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/30'
                            : 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/40'
                        } ${c.inactive ? 'opacity-60' : ''}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Package size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate font-mono text-[13px] font-bold text-slate-800">{c.container_code}</span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500">
                            {c.type_code} · {c.location || 'no slot'}
                          </div>
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            {c.batch_count ?? 0} batch{(c.batch_count ?? 0) === 1 ? '' : 'es'}
                            {c.inactive ? ' · inactive' : ''}
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <span className="text-[13px] font-bold text-slate-900">{Number(c.current_qty_kg || 0).toFixed(2)}<span className="text-[10px] font-medium text-slate-400"> kg</span></span>
                          <span className={fillBadgeCls(c.fill_status)}>{c.fill_status}</span>
                        </div>
                        {sel && (
                          <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </Step>
          )}

          {/* Step 3 — batch */}
          {container && (
            <Step
              n={3}
              title="Batch"
              state={batchState}
              summary={batch ? `${batch.biomass_batch_code} · ${Number(batch.remaining_qty_kg).toFixed(3)} kg available` : null}
              onChange={() => pickBatch(null)}
            >
              <div className="mb-3 text-xs font-medium text-slate-500">
                {batches.length} batch{batches.length === 1 ? '' : 'es'} in {container.container_code}
              </div>
              {loadingBatches ? (
                <SkeletonRows />
              ) : batches.length === 0 ? (
                <EmptyLine icon={Beaker} text="No batches recorded for this container." />
              ) : (
                <div className="space-y-2.5">
                  {batches.map((b) => {
                    const selectable = batchSelectable(b)
                    const sel = batch?.inward_id === b.inward_id
                    return (
                      <button
                        type="button"
                        key={b.inward_id}
                        disabled={!selectable}
                        onClick={() => pickBatch(b)}
                        className={`relative flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition ${
                          sel
                            ? 'border-rose-500 bg-rose-50 ring-2 ring-rose-500/30'
                            : selectable
                              ? 'border-slate-200 hover:border-rose-300 hover:bg-rose-50/40'
                              : 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-70'
                        }`}
                      >
                        <div className="min-w-0 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <FlaskConical size={13} className="shrink-0 text-slate-400" />
                            <span className="truncate font-mono font-bold text-slate-800">{b.biomass_batch_code}</span>
                            <span className={statusBadgeCls(b.status)}>{b.status}</span>
                          </div>
                          <div className="mt-1 text-slate-500">
                            Harvested {fmtDate(b.date_of_harvest)} · CFU/g {fmtCfu(b.inhouse_cfu_per_g)}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="text-[13px] font-bold text-slate-900">
                            {Number(b.remaining_qty_kg).toFixed(3)}<span className="text-[10px] font-medium text-slate-400"> kg</span>
                          </div>
                          <div className="text-[10px] text-slate-400">of {Number(b.total_qty_kg).toFixed(3)}</div>
                        </div>
                        {sel && (
                          <span className="absolute -right-2 -top-2 grid h-5 w-5 place-items-center rounded-full bg-rose-600 text-white">
                            <Check size={12} strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </Step>
          )}

          {/* Step 4 — loss form */}
          {batch && (
            <section className="rounded-xl border border-rose-200 bg-white shadow-sm">
              <header className="flex items-center gap-3 border-b border-rose-100 bg-rose-50/60 px-4 py-3.5 sm:px-5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-rose-600 text-xs font-bold text-white">4</span>
                <h3 className="flex-1 text-sm font-semibold text-slate-900">Record the loss</h3>
                <IconButton icon={X} onClick={() => pickBatch(null)} variant="danger" size="sm" tooltip="Cancel" />
              </header>

              <div className="space-y-4 p-4 sm:p-5">
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Recording loss against</div>
                  <div className="mt-0.5 truncate font-mono text-[13px] font-bold text-rose-900">
                    {batch.container_code} / {batch.biomass_batch_code}
                  </div>
                  <div className="mt-0.5 text-xs text-rose-500">
                    {maxQty.toFixed(3)} kg available · CFU/g {fmtCfu(batch.inhouse_cfu_per_g)}
                  </div>
                </div>

                <div>
                  <label className={LABEL}>
                    Loss quantity <span className="font-normal text-slate-400">— max {maxQty.toFixed(3)} kg</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="0.001" step="0.001" max={maxQty}
                      value={lossQty}
                      onChange={(e) => setLossQty(e.target.value)}
                      placeholder="0.000"
                      className={`${INPUT} pr-12`}
                    />
                    <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">KG</span>
                  </div>
                  {lossValid && (
                    <div className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                      <Check size={12} strokeWidth={3} />
                      {(maxQty - lossNum).toFixed(3)} kg will remain in this batch
                    </div>
                  )}
                </div>

                <div>
                  <label className={LABEL}>Reason</label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {REASON_CATEGORIES.map((r) => (
                      <button
                        key={r.value}
                        type="button"
                        onClick={() => setReasonCategory(r.value)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${
                          reasonCategory === r.value
                            ? 'border-rose-600 bg-rose-600 text-white shadow-sm'
                            : 'border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50'
                        }`}
                      >
                        {r.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={LABEL}>Remarks <span className="font-normal text-slate-400">(optional)</span></label>
                  <input value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Any additional note" className={INPUT} />
                </div>

                <Can
                  permission="microbial.sfg-adjustment.create"
                  fallback={
                    <p className="rounded-lg bg-slate-50 px-3 py-2.5 text-center text-xs text-slate-400">
                      You don’t have permission to record stock loss adjustments.
                    </p>
                  }
                >
                  <Button
                    onClick={submit}
                    disabled={createAdjustment.isPending || !lossValid || !reasonCategory}
                    loading={createAdjustment.isPending}
                    variant="danger-solid"
                    fullWidth
                  >
                    {createAdjustment.isPending ? 'Recording…' : `Record loss of ${lossValid ? lossNum.toFixed(3) : '0.000'} kg`}
                  </Button>
                </Can>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── small helpers ─────────────────────────────────────────────────────── */
function SkeletonRows() {
  return (
    <div className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
      ))}
    </div>
  )
}

function EmptyLine({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-4 text-xs text-slate-400">
      <Icon size={14} /> {text}
    </div>
  )
}
