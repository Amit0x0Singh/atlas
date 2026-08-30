import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../../../../context/context.jsx'
import AdjustmentTab from '../adjustment-tab/AdjustmentTab.jsx'
import AdjustmentRecords from '../adjustment-tab/AdjustmentRecords.jsx'
import { usePreviewOutward, useCreateOutward, useEligibleBatches } from '../../../../../hooks/microbial/useMicrobialOutward.js'
import { microbialSfgApi } from '../../../../../api/microbial.js'
import { planTasksApi } from '../../../../../api/production.js'
import { productApi } from '../../../../../api/masters.js'
import TaskPicker from './TaskPicker.jsx'
import MicrobeChecklist from './MicrobeChecklist.jsx'
import AltContainerModal from './AltContainerModal.jsx'
import OutwardHistory from './OutwardHistory.jsx'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { cfuCoverage, fmtCfu, microbeProgress, G_PER_KG } from '../../utils/format.js'

let rid = 0
const newRow = (m = {}) => ({
  id: m.id || `row-${++rid}`,
  microbe_id: m.microbe_id || '', microbe_code: m.microbe_code || '', microbe_name: m.microbe_name || '',
  required_qty_kg: m.required_qty_kg != null ? String(m.required_qty_kg) : '',
  required_cfu_per_g: m.required_cfu_per_g != null ? String(m.required_cfu_per_g) : '',
  issued_cfu: Number(m.issued_cfu) || 0,
  issued_qty_kg: Number(m.issued_qty_kg) || 0,
  calc: null, // transient FEFO suggestion — never persisted to the session
})

const EMPTY_HEADER = {
  product_name: '', customer_name: '', di_number: '', batch_code: '',
  section: '', order_qty_kg: '', issuer_name: '', receiver_name: '',
}

export default function OutwardTab({ adjustView = null, outwardView = null, registerBackHandler }) {
  const { user } = useApp()
  const [step, setStep] = useState('select')
  const [selectedTask, setSelectedTask] = useState(null)
  const [checking, setChecking] = useState(false)
  const [sessionId, setSessionId] = useState(null)
  const [completed, setCompleted] = useState(false)

  const [tasks, setTasks] = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [taskFilter, setTaskFilter] = useState({ plant: '', date: '' })
  const [products, setProducts] = useState([])
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(false)

  const [header, setHeader] = useState(EMPTY_HEADER)
  const [rows, setRows] = useState([])
  const [activeRowId, setActiveRowId] = useState(null)
  const [calculatingId, setCalculatingId] = useState(null)
  const [issuingId, setIssuingId] = useState(null)
  const [altPickerRow, setAltPickerRow] = useState(null)
  const [altBatches, setAltBatches] = useState([])

  const preview = usePreviewOutward()
  const createOutward = useCreateOutward()
  const eligibleBatches = useEligibleBatches()

  useEffect(() => {
    setLoadingTasks(true)
    planTasksApi.list().then((r) => setTasks(r.data || [])).catch(() => {}).finally(() => setLoadingTasks(false))
  }, [])

  useEffect(() => {
    productApi.search().then((r) => setProducts(r.data || [])).catch(() => {})
  }, [])

  const loadSessions = useCallback(() => {
    setLoadingSessions(true)
    microbialSfgApi.outwardSessions.list().then((r) => setSessions(r.data || [])).catch(() => {}).finally(() => setLoadingSessions(false))
  }, [])
  useEffect(() => { loadSessions() }, [loadSessions])

  // Auto-save the in-progress issuance server-side on every change so it's
  // resumable from any device. `calc` (transient FEFO) is stripped — only the
  // cumulative issued_* progress persists.
  useEffect(() => {
    if (step !== 'issue' || !sessionId || completed) return
    microbialSfgApi.outwardSessions.upsert(sessionId, {
      plan_task_id: selectedTask?.id || null,
      header,
      // eslint-disable-next-line no-unused-vars
      rows: rows.map(({ calc, ...r }) => r),
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header, rows, sessionId, completed])

  const setHeaderField = (k, v) => setHeader((p) => ({ ...p, [k]: v }))
  const updateRow = (id, patch) => setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)))

  // FEFO against the microbe's REMAINING CFU gap (required − already issued),
  // expressed back as "kg at the required potency" for the preview endpoint
  // (which multiplies kg × 1000 × cfu/g).
  const calculateRow = async (row, { silent } = {}) => {
    const prog = microbeProgress(row)
    if (prog.done || prog.remainingKgEq <= 0) return
    if (!silent) setCalculatingId(row.id)
    try {
      const res = await preview.mutateAsync({
        requirements: [{
          microbe_code: row.microbe_code,
          required_qty_kg: prog.remainingKgEq,
          required_cfu_per_g: Number(row.required_cfu_per_g),
        }],
      })
      const calc = res?.[0]
      if (calc?.error) { if (!silent) alert(calc.error); return }
      updateRow(row.id, {
        calc: {
          total_cfu_needed: calc.total_cfu_needed,
          remaining_cfu: calc.remaining_cfu,
          fulfilled: calc.fulfilled,
          allocations: calc.allocations,
        },
      })
    } catch (err) { if (!silent) alert(err.message) }
    if (!silent) setCalculatingId(null)
  }

  const openRow = async (rowId) => {
    if (activeRowId === rowId) { setActiveRowId(null); return }
    setActiveRowId(rowId)
    const row = rows.find((r) => r.id === rowId)
    if (row && !row.calc && !microbeProgress(row).done) await calculateRow(row)
  }

  const selectTask = async (task) => {
    setChecking(true)
    try {
      const match = products.find((p) =>
        (task.productCode && p.productCode === task.productCode) ||
        p.productName?.toLowerCase() === task.productName?.toLowerCase()
      )
      const productCode = task.productCode || match?.productCode
      if (!productCode) { alert(`Could not resolve a product code for "${toTitleCase(task.productName)}". Check Product Master.`); return }

      const res = await microbialSfgApi.productMicrobes({
        product_code: productCode,
        qty: task.qty,
        ...(task.recipeNo != null ? { recipe_no: task.recipeNo } : {}),
      })
      if (!res.has_microbes || !res.microbes?.length) {
        alert(`No microbe ingredients were detected in the recipe for "${toTitleCase(task.productName)}". Nothing to issue here.`)
        return
      }

      setHeader({
        ...EMPTY_HEADER,
        product_name: task.productName || '',
        di_number: task.diNo || '',
        batch_code: task.batchCode || '',
        order_qty_kg: task.qty != null ? String(task.qty) : '',
        // Section = the plant this task was planned against (Planning
        // already captures this) and Issuer = whoever is logged in and
        // actually running this issuance — neither should be re-typed here.
        section: task.plant || '',
        issuer_name: user?.fullName || '',
      })
      setRows(res.microbes.map((m) => newRow(m)))
      setSelectedTask(task)
      setSessionId(Date.now().toString())
      setCompleted(false)
      setActiveRowId(null)
      setStep('issue')

      planTasksApi.update(task.id, { microbeIssueStarted: true, microbeIssueStartedAt: new Date().toISOString() }).catch(() => {})
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, microbeIssueStarted: true } : t)))
    } catch (err) { alert(err.message) }
    finally { setChecking(false) }
  }

  const resumeSession = (s) => {
    const task = tasks.find((t) => t.id === s.plan_task_id) || null
    // Sessions auto-saved before Section/Issuer became auto-filled (or ones
    // whose task lookup happens to miss) can carry a blank header — backfill
    // from the resolved task/logged-in user the same way selectTask does,
    // instead of resuming with permanently blank fields.
    setHeader({
      ...EMPTY_HEADER,
      ...s.header,
      section: s.header?.section || task?.plant || '',
      issuer_name: s.header?.issuer_name || user?.fullName || '',
    })
    setRows((s.rows || []).map((r) => newRow(r)))
    setSelectedTask(task)
    setSessionId(s.id)
    setCompleted(false)
    setActiveRowId(null)
    setStep('issue')
  }

  const updateAllocationQty = (rowId, inwardId, val) => {
    setRows((rs) => rs.map((r) => {
      if (r.id !== rowId || !r.calc) return r
      return { ...r, calc: { ...r.calc, allocations: r.calc.allocations.map((a) => (a.inward_id === inwardId ? { ...a, qty_issued_kg: val } : a)) } }
    }))
  }

  const removeAllocation = async (rowId, inwardId) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row?.calc) return
    const keptAllocations = row.calc.allocations.filter((a) => a.inward_id !== inwardId)
    const reqCfuPerG = Number(row.required_cfu_per_g)
    const { shortCfu } = cfuCoverage({ ...row, calc: { ...row.calc, allocations: keptAllocations } })
    const excludeIds = row.calc.allocations.map((a) => a.inward_id)

    if (shortCfu <= 1) { updateRow(rowId, { calc: { ...row.calc, allocations: keptAllocations } }); return }

    try {
      const res = await preview.mutateAsync({
        requirements: [{
          microbe_code: row.microbe_code,
          required_qty_kg: shortCfu / (G_PER_KG * reqCfuPerG),
          required_cfu_per_g: reqCfuPerG,
          exclude_inward_ids: excludeIds,
        }],
      })
      const backfill = res?.[0]?.allocations || []
      updateRow(rowId, { calc: { ...row.calc, allocations: [...keptAllocations, ...backfill] } })
    } catch (err) { alert(err.message) }
  }

  const openBatchPicker = async (rowId, { allocationInwardId = null, mode = 'swap' } = {}) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row) return
    try {
      const batches = await eligibleBatches.mutateAsync(row.microbe_code)
      const usedIds = new Set((row.calc?.allocations || []).map((a) => a.inward_id))
      setAltBatches(batches.filter((b) => !usedIds.has(b.inward_id) || b.inward_id === allocationInwardId))
      setAltPickerRow({ rowId, allocationInwardId, mode })
    } catch (err) { alert(err.message) }
  }
  const openAltPicker = (rowId, allocationInwardId) => openBatchPicker(rowId, { allocationInwardId, mode: 'swap' })
  const openAddBatch = (rowId) => openBatchPicker(rowId, { mode: 'add' })

  const allocationFromBatch = (b, qty) => ({
    inward_id: b.inward_id, container_id: b.container_id, container_code: b.container_code,
    type_code: b.type_code, location: b.location, biomass_batch_code: b.biomass_batch_code,
    date_of_harvest: b.date_of_harvest, expiry_date: b.expiry_date, available_kg: b.available_kg,
    cfu_per_g: b.cfu_per_g,
    qty_issued_kg: Number(Math.max(0, Math.min(qty, Number(b.available_kg))).toFixed(6)),
  })

  const pickBatch = (batch) => {
    if (!altPickerRow) return
    const { rowId, allocationInwardId, mode } = altPickerRow
    setRows((rs) => rs.map((r) => {
      if (r.id !== rowId || !r.calc) return r
      const reqCfuPerG = Number(r.required_cfu_per_g) || 0
      const batchCfuPerG = Number(batch.cfu_per_g) || 0

      if (mode === 'add') {
        const { shortCfu } = cfuCoverage(r)
        const kgNeeded = shortCfu <= 1 ? 0
          : batchCfuPerG > 0 ? shortCfu / (G_PER_KG * batchCfuPerG)
          : Number(batch.available_kg)
        return { ...r, calc: { ...r.calc, allocations: [...r.calc.allocations, allocationFromBatch(batch, kgNeeded)] } }
      }

      const old = r.calc.allocations.find((a) => a.inward_id === allocationInwardId)
      const oldCfu = Number(old?.qty_issued_kg || 0) * G_PER_KG * (Number(old?.cfu_per_g) || reqCfuPerG)
      const kg = batchCfuPerG > 0 ? oldCfu / (G_PER_KG * batchCfuPerG) : Number(batch.available_kg)
      const replacement = allocationFromBatch(batch, kg || Number(batch.available_kg))
      return { ...r, calc: { ...r.calc, allocations: r.calc.allocations.map((a) => (a.inward_id === allocationInwardId ? replacement : a)) } }
    }))
    setAltPickerRow(null)
  }

  // ── Issue ONE microbe (partial allowed) ──────────────────────────────────
  const issueMicrobe = async (rowId) => {
    const row = rows.find((r) => r.id === rowId)
    if (!row?.calc?.allocations?.length) { alert('Calculate FEFO first'); return }

    const cov = cfuCoverage(row)
    if (cov.isOver) {
      alert(`Cannot issue — this is set to deliver ${fmtCfu(cov.overCfu)} CFU more than what's still needed. Reduce a batch quantity.`)
      return
    }
    const allocs = row.calc.allocations
      .filter((a) => Number(a.qty_issued_kg) > 0)
      .map((a) => ({ inward_id: a.inward_id, qty_issued_kg: Number(a.qty_issued_kg) }))
    if (!allocs.length) { alert('Set an issue quantity on at least one batch.'); return }

    // Target THIS issuance at the still-outstanding CFU (as kg-at-required-
    // potency), not the full requirement — so the backend's CFU over-guard
    // also protects against over-issuing beyond what's still needed.
    const prog = microbeProgress(row)
    const thisRequiredQtyKg = Math.max(prog.remainingKgEq, 0.000001)

    setIssuingId(rowId)
    try {
      const result = await createOutward.mutateAsync({
        product_name: header.product_name,
        customer_name: header.customer_name || null,
        di_number: header.di_number || null,
        batch_code: header.batch_code || null,
        section: header.section || null,
        order_qty_kg: header.order_qty_kg ? Number(header.order_qty_kg) : null,
        issuer_name: header.issuer_name || null,
        receiver_name: header.receiver_name || null,
        plan_task_id: selectedTask?.id || null,
        requirements: [{
          microbe_id: row.microbe_id, microbe_code: row.microbe_code, microbe_name: row.microbe_name,
          required_qty_kg: thisRequiredQtyKg, required_cfu_per_g: Number(row.required_cfu_per_g),
          allocations: allocs,
        }],
      })

      const lines = result.lines || []
      const addedCfu = lines.reduce((s, l) => s + Number(l.qty_issued_kg) * G_PER_KG * Number(l.cfu_per_g_at_issue), 0)
      const addedKg = lines.reduce((s, l) => s + Number(l.qty_issued_kg), 0)

      let updatedRow = null
      setRows((rs) => {
        const next = rs.map((r) => {
          if (r.id !== rowId) return r
          updatedRow = {
            ...r,
            issued_cfu: (Number(r.issued_cfu) || 0) + addedCfu,
            issued_qty_kg: (Number(r.issued_qty_kg) || 0) + addedKg,
            calc: null,
          }
          return updatedRow
        })
        maybeComplete(next)
        return next
      })

      if (updatedRow && microbeProgress(updatedRow).done) {
        setActiveRowId(null)
      } else if (updatedRow) {
        // Still short — re-run FEFO against the new (smaller) remaining gap so
        // the operator can immediately issue the next chunk when stock allows.
        calculateRow(updatedRow, { silent: true })
      }
    } catch (err) { alert(err.message) }
    finally { setIssuingId(null) }
  }

  const maybeComplete = (nextRows) => {
    const allDone = nextRows.length > 0 && nextRows.every((r) => microbeProgress(r).done)
    if (!allDone) return
    if (sessionId) microbialSfgApi.outwardSessions.delete(sessionId).catch(() => {})
    if (selectedTask?.id) {
      planTasksApi.update(selectedTask.id, {
        microbeIssueCompleted: true,
        microbeIssueCompletedAt: new Date().toISOString(),
      }).catch(() => {})
      setTasks((prev) => prev.map((t) => (t.id === selectedTask.id ? { ...t, microbeIssueCompleted: true } : t)))
    }
    setSessionId(null)
    setCompleted(true)
  }

  const backToSelect = useCallback(() => {
    setStep('select'); setSelectedTask(null); setHeader(EMPTY_HEADER); setRows([])
    setSessionId(null); setCompleted(false); setActiveRowId(null)
    loadSessions()
  }, [loadSessions])

  useEffect(() => {
    if (!registerBackHandler) return
    registerBackHandler(step === 'issue' && !adjustView && !outwardView ? backToSelect : null)
    return () => registerBackHandler(null)
  }, [step, adjustView, outwardView, backToSelect, registerBackHandler])

  if (adjustView === 'form') return <AdjustmentTab />
  if (adjustView === 'records') return <AdjustmentRecords />
  if (outwardView === 'history') return <OutwardHistory tasks={tasks} />

  if (step === 'select') {
    return (
      <TaskPicker
        tasks={tasks}
        loadingTasks={loadingTasks}
        taskFilter={taskFilter}
        setTaskFilter={setTaskFilter}
        onSelectTask={selectTask}
        checking={checking}
        sessions={sessions}
        loadingSessions={loadingSessions}
        onResumeSession={resumeSession}
      />
    )
  }

  return (
    <div className="space-y-6">
      <MicrobeChecklist
        header={header}
        onHeaderField={setHeaderField}
        selectedTask={selectedTask}
        rows={rows}
        completed={completed}
        activeRowId={activeRowId}
        calculatingId={calculatingId}
        issuingId={issuingId}
        onToggleRow={openRow}
        onCalculate={calculateRow}
        onIssueMicrobe={issueMicrobe}
        onAllocationQtyChange={updateAllocationQty}
        onAllocationRemove={removeAllocation}
        onAllocationChange={openAltPicker}
        onAddBatch={openAddBatch}
        onBack={backToSelect}
      />

      <AltContainerModal
        open={!!altPickerRow}
        onClose={() => setAltPickerRow(null)}
        batches={altBatches}
        mode={altPickerRow?.mode || 'swap'}
        gap={(() => {
          const r = rows.find((x) => x.id === altPickerRow?.rowId)
          return r ? cfuCoverage(r) : null
        })()}
        requiredCfuPerG={Number(rows.find((x) => x.id === altPickerRow?.rowId)?.required_cfu_per_g) || 0}
        onSelect={pickBatch}
      />
    </div>
  )
}
