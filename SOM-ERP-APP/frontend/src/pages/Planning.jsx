import { useState, useEffect, useCallback } from 'react'
import { planningApi, indentApi, equipmentApi, productionApi, employeeApi, microbialSfgApi, bomSendApi } from '../api/client'

// ── Constants ─────────────────────────────────────────────────────────────────
const SECTIONS   = ['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES']
const SHIFTS     = [
  { value: 'A', label: 'A Shift — 6:00 AM to 2:00 PM' },
  { value: 'G', label: 'G Shift — 9:00 AM to 5:30 PM' },
  { value: 'B', label: 'B Shift — 2:00 PM to 10:00 PM' },
  { value: 'C', label: 'C Shift — 10:00 PM to 6:00 AM' },
]
const PLAN_STATUSES = ['DRAFT', 'REVIEWED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

const SECTION_ICON = { NANO:'🔬', BOTANICAL:'🌿', LIQUID:'💧', POWDER:'🧪', GRANULES:'🌾' }
const SECTION_COLOR = {
  NANO:      'bg-blue-50 border-blue-200 text-blue-800',
  BOTANICAL: 'bg-green-50 border-green-200 text-green-800',
  LIQUID:    'bg-cyan-50 border-cyan-200 text-cyan-800',
  POWDER:    'bg-purple-50 border-purple-200 text-purple-800',
  GRANULES:  'bg-amber-50 border-amber-200 text-amber-800',
}

const PRIORITY_STYLE = {
  MODERATE:   'bg-gray-100 text-gray-600',
  URGENT:     'bg-orange-100 text-orange-700',
  VERY_URGENT:'bg-red-100 text-red-700',
}

const STATUS_STYLE = {
  DRAFT:       'bg-yellow-100 text-yellow-700',
  REVIEWED:    'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-indigo-100 text-indigo-700',
  COMPLETED:   'bg-green-100 text-green-700',
  CANCELLED:   'bg-gray-100 text-gray-400',
}

const RM_STATUS_STYLE = {
  GREEN: 'text-green-600',
  AMBER: 'text-amber-500',
  RED:   'text-red-600',
}
const RM_STATUS_ICON = { GREEN: '✅', AMBER: '⚠️', RED: '❌' }
const EQP_STYLE = { AVAILABLE:'text-green-600', BUSY:'text-red-500', UNKNOWN:'text-gray-400' }

function fmt(date) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

// ── Pending Orders Panel ──────────────────────────────────────────────────────
function PendingOrdersPanel({ orders }) {
  const today = new Date()

  if (!orders.length) return (
    <div className="text-center py-8 text-gray-400">
      <div className="text-3xl mb-2">🎉</div>
      <p className="text-sm font-medium">All orders are planned!</p>
    </div>
  )

  return (
    <div className="space-y-2">
      {orders.map(item => {
        const so      = item.salesOrder
        const etd     = new Date(so.estimatedDispatchDate)
        const daysLeft = Math.ceil((etd - today) / 86400000)
        const overdue  = daysLeft < 0
        return (
          <div key={item.id} className={`flex items-start gap-3 p-3 rounded-xl border ${overdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-white'}`}>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-0.5">
                <span className="font-semibold text-sm text-gray-900">{item.inhouseProductName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${PRIORITY_STYLE[so.priority]}`}>
                  {so.priority.replace('_',' ')}
                </span>
                {item.sectionName && (
                  <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${SECTION_COLOR[item.sectionName] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {SECTION_ICON[item.sectionName]} {item.sectionName}
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500">
                DI: <strong>{so.diNo}</strong> · {so.customerName} · {item.totalQty} {item.totalUom}
              </div>
            </div>
            <div className={`text-xs font-semibold text-right shrink-0 ${overdue ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-500' : 'text-gray-400'}`}>
              ETD: {fmt(so.estimatedDispatchDate)}
              <div>{overdue ? `${Math.abs(daysLeft)}d overdue` : `${daysLeft}d left`}</div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Microbial SFG Availability Panel ─────────────────────────────────────────
// Shown inside PlanEditModal when product recipe has microbe ingredients.
// Allows user to enter Multiplication Factor, view available SFG types,
// required qty per type, and allocate from FIFO stock.
function MicrobialSFGPanel({ plan, multiplicationFactor, onMfChange }) {
  const [sfgData, setSfgData]     = useState(null)
  const [loading, setLoading]     = useState(false)
  const [allocating, setAllocating] = useState(false)
  const [allocations, setAllocations] = useState([])
  const [selectedType, setSelectedType] = useState({}) // microbeName → typeKey
  const [mfInput, setMfInput]     = useState(String(multiplicationFactor || 1))
  const [checked, setChecked]     = useState(false)

  const fmtCfu = (v) => {
    if (!v) return '—'
    const n = Number(v)
    if (n >= 1e11) return `${(n/1e11).toFixed(2)}×10¹¹`
    if (n >= 1e10) return `${(n/1e10).toFixed(2)}×10¹⁰`
    if (n >= 1e9)  return `${(n/1e9).toFixed(2)}×10⁹`
    if (n >= 1e8)  return `${(n/1e8).toFixed(2)}×10⁸`
    return n.toExponential(2)
  }

  const checkSfg = async (mf) => {
    if (!plan?.planId) return
    setLoading(true)
    try {
      const res = await microbialSfgApi.checkPlanMicrobes(plan.planId, mf || 1)
      setSfgData(res)
      setChecked(true)
      if (res?.has_microbes && onMfChange) onMfChange(parseFloat(mf) || 1)
    } catch { /* silent */ }
    setLoading(false)
  }

  // Load existing allocations
  useEffect(() => {
    if (!plan?.planId) return
    microbialSfgApi.listAllocations(plan.planId)
      .then(r => setAllocations(r?.data || []))
      .catch(() => {})
    // Auto-check on mount
    checkSfg(mfInput)
  }, [plan?.planId])

  const handleAllocate = async (microbe, typeData) => {
    if (!typeData || !typeData.batches?.length) return
    const mf   = parseFloat(mfInput) || 1
    const reqKg = typeData.required_qty_kg

    if (!reqKg || reqKg <= 0) {
      alert('Cannot allocate: required CFU not set in recipe for this microbe.')
      return
    }

    // Build FIFO picks
    let remaining = reqKg
    const picks = []
    for (const batch of typeData.batches) {
      if (remaining <= 0) break
      const take = Math.min(remaining, Number(batch.remaining_qty_kg))
      if (take > 0) {
        picks.push({
          inward_id:        batch.inward_id,
          container_code:   batch.container_code,
          inhouse_cfu_per_g: Number(batch.inhouse_cfu_per_g),
          qty_kg:            parseFloat(take.toFixed(3)),
        })
        remaining -= take
      }
    }

    if (remaining > 0.001) {
      if (!confirm(`Stock is insufficient — only ${(reqKg - remaining).toFixed(3)} kg available, need ${reqKg.toFixed(3)} kg. Allocate partial?`)) return
    }

    setAllocating(true)
    try {
      await microbialSfgApi.allocate({
        plan_id:               plan.planId,
        microbe_code:          microbe.microbe_code,
        microbe_name:          microbe.rm_name,
        microbe_type:          typeData.microbe_type,
        multiplication_factor: mf,
        required_cfu_per_g:    microbe.required_cfu_per_g,
        order_qty_kg:          microbe.order_qty_kg,
        picks,
      })
      // Refresh
      const [allocs, sfg] = await Promise.all([
        microbialSfgApi.listAllocations(plan.planId),
        microbialSfgApi.checkPlanMicrobes(plan.planId, mf),
      ])
      setAllocations(allocs?.data || [])
      setSfgData(sfg)
      alert(`✅ Allocated ${picks.reduce((s,p)=>s+p.qty_kg,0).toFixed(3)} kg — Cold Room incharge has been notified!`)
    } catch (err) {
      alert('Allocation failed: ' + err.message)
    }
    setAllocating(false)
  }

  const handleCancelAlloc = async (allocId) => {
    if (!confirm('Cancel this allocation?')) return
    try {
      await microbialSfgApi.cancelAllocation(allocId)
      const [allocs, sfg] = await Promise.all([
        microbialSfgApi.listAllocations(plan.planId),
        microbialSfgApi.checkPlanMicrobes(plan.planId, parseFloat(mfInput)||1),
      ])
      setAllocations(allocs?.data || [])
      setSfgData(sfg)
    } catch (err) { alert(err.message) }
  }

  // Don't show panel if check done and no microbes
  if (checked && sfgData && !sfgData.has_microbes) return null

  return (
    <div className="border-t pt-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-bold text-teal-700 uppercase tracking-wide">🦠 Microbial SFG Availability</span>
        <span className="text-xs text-gray-400 ml-auto">Required = MF × Req.CFU × Order Qty ÷ Inhouse CFU</span>
      </div>

      {/* MF row */}
      <div className="flex items-end gap-3 mb-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Multiplication Factor (MF)</label>
          <input
            type="number" min="0.1" step="0.1"
            value={mfInput}
            onChange={e => setMfInput(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-28 focus:ring-2 focus:ring-teal-400 focus:outline-none font-bold"
          />
        </div>
        <button
          type="button"
          onClick={() => checkSfg(mfInput)}
          disabled={loading}
          className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 disabled:opacity-50"
        >
          {loading ? '⏳ Checking…' : '🔍 Check SFG'}
        </button>
        {allocations.length > 0 && (
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
            {allocations.length} allocation(s) done
          </span>
        )}
      </div>

      {/* Microbe list */}
      {sfgData?.has_microbes && sfgData.microbes?.map((microbe, mi) => (
        <div key={mi} className="border border-teal-200 rounded-xl mb-3 overflow-hidden">
          <div className="bg-teal-50 px-4 py-2 flex items-center gap-3">
            <span className="font-bold text-teal-800 text-sm">{microbe.rm_name}</span>
            {microbe.microbe_code && <span className="text-xs bg-teal-200 text-teal-800 px-2 py-0.5 rounded-full font-mono">{microbe.microbe_code}</span>}
            <span className="text-xs text-gray-500 ml-auto">
              Req. CFU/g: <strong>{fmtCfu(microbe.required_cfu_per_g) || 'Not set in recipe'}</strong>
              &nbsp;·&nbsp;Order: <strong>{microbe.order_qty_kg} kg</strong>
            </span>
          </div>

          {microbe.types.length === 0 ? (
            <div className="px-4 py-3 text-xs text-amber-700 bg-amber-50">
              ⚠️ No SFG stock found for this microbe. Add inward entries in <strong>Microbial Inward</strong>.
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left px-4 py-2 font-semibold text-gray-500">Type</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">Available (kg)</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">Avg CFU/g</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">Required (kg)</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">Status</th>
                  <th className="text-right px-4 py-2 font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody>
                {microbe.types.map((t, ti) => {
                  const sufficient = t.is_sufficient
                  const alreadyAllocated = allocations.some(a =>
                    a.microbe_code === microbe.microbe_code && a.microbe_type === t.microbe_type && a.status !== 'CANCELLED'
                  )
                  return (
                    <tr key={ti} className={`border-t ${ti % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-4 py-2 font-semibold text-gray-800">{t.microbe_type}</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-800">{t.total_available_kg.toFixed(3)}</td>
                      <td className="px-4 py-2 text-right text-gray-600">{fmtCfu(t.avg_cfu_per_g)}</td>
                      <td className="px-4 py-2 text-right font-bold text-indigo-700">
                        {t.required_qty_kg != null ? t.required_qty_kg.toFixed(3) : <span className="text-gray-400">Set req. CFU in recipe</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {sufficient === null ? <span className="text-gray-400">—</span>
                          : sufficient ? <span className="text-green-600 font-bold">✅ OK</span>
                          : <span className="text-red-500 font-bold">⚠️ Low</span>}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {alreadyAllocated ? (
                          <span className="text-green-600 font-bold text-xs">✅ Allocated</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAllocate(microbe, t)}
                            disabled={allocating || t.total_available_kg === 0}
                            className="px-3 py-1 bg-teal-600 text-white rounded text-xs font-bold hover:bg-teal-700 disabled:opacity-40"
                          >
                            {allocating ? '…' : 'Select & Allocate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* Existing allocations */}
      {allocations.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mt-2">
          <p className="text-xs font-bold text-green-800 mb-2">🧊 Current Microbial Allocations (Cold Room Pick List)</p>
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left py-1 text-gray-500 font-semibold">Microbe</th>
                <th className="text-left py-1 text-gray-500 font-semibold">Type</th>
                <th className="text-left py-1 text-gray-500 font-semibold">Container</th>
                <th className="text-right py-1 text-gray-500 font-semibold">Qty (kg)</th>
                <th className="text-right py-1 text-gray-500 font-semibold">MF</th>
                <th className="text-right py-1 text-gray-500 font-semibold">Status</th>
                <th className="py-1"></th>
              </tr>
            </thead>
            <tbody>
              {allocations.map(a => (
                <tr key={a.allocation_id} className="border-t border-green-100">
                  <td className="py-1 text-gray-800">{a.microbe_name}</td>
                  <td className="py-1 text-gray-600">{a.microbe_type}</td>
                  <td className="py-1 font-mono text-gray-700">{a.container_code}</td>
                  <td className="py-1 text-right font-bold text-teal-700">{Number(a.allocated_qty_kg).toFixed(3)}</td>
                  <td className="py-1 text-right text-gray-500">{a.multiplication_factor}×</td>
                  <td className="py-1 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${a.status === 'RESERVED' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                      {a.status}
                    </span>
                  </td>
                  <td className="py-1 text-right">
                    {a.status !== 'PICKED' && (
                      <button type="button" onClick={() => handleCancelAlloc(a.allocation_id)}
                        className="text-red-500 hover:text-red-700 text-xs font-semibold">✕</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Plan Edit Modal ───────────────────────────────────────────────────────────
// Pre-fills from plan data (which comes from Sales Order via plan engine).
// Equipment is a smart dropdown filtered by section from Equipment Master.
// No. of cycles auto-calculated from total qty ÷ equipment capacity.
function PlanEditModal({ plan, onSave, onClose }) {
  const section = plan.sectionType
  const [equipList,  setEquipList]  = useState([])
  const [employees,  setEmployees]  = useState([])

  // Load equipment (filtered by plant/section) + employees (filtered by section)
  useEffect(() => {
    // Equipment Master: field is `plant` (matches section), capacity is `workingVolume`, name is `equipName`
    equipmentApi.list().then(res => {
      const all = res?.data || (Array.isArray(res) ? res : [])
      const filtered = all.filter(e => !e.plant || e.plant.toUpperCase() === section.toUpperCase())
      setEquipList(filtered.length ? filtered : all)
    }).catch(() => {})

    // Employee list — filter by section if employee has a department/section field
    employeeApi.list({}).then(res => {
      const all = res?.data || (Array.isArray(res) ? res : [])
      // Filter by section; if no section on employee, show all
      const filtered = all.filter(e =>
        !e.department || e.department.toUpperCase() === section.toUpperCase() ||
        !e.section    || e.section.toUpperCase()    === section.toUpperCase()
      )
      setEmployees(filtered.length ? filtered : all)
    }).catch(() => {})
  }, [section])

  // Pick the first matching equipment as default if plan has no equipment set yet
  const defaultEquip = plan.equipment || ''

  // Auto-populate packing fields from plan (plan engine should have copied them from SO)
  const [form, setForm] = useState({
    plannedDate:      plan.plannedDate ? plan.plannedDate.split('T')[0] : '',
    shift:            plan.shift            || '',
    batchIncharge:    plan.batchIncharge    || '',
    equipment:        defaultEquip,
    location:         plan.location         || '',
    batchCode:        plan.batchCode        || '',
    carrier:          plan.carrier          || '',
    specs:            plan.specs            || '',
    process:          plan.process          || '',
    stageInfo:        plan.stageInfo        || '',
    noOfCycles:       plan.noOfCycles       || '1',
    cycleBatchSize:   plan.cycleBatchSize   || String(plan.totalQty || ''),
    unitPackQty:      plan.unitPackQty      || '',
    noOfUnits:        plan.noOfUnits        || '',
    pp1:              plan.pp1              || plan.unitPackType || '',
    pp2:              plan.pp2              || '',
    sp1:              plan.sp1              || plan.packingType  || '',
    noOfSp:           plan.noOfSp           || plan.totalCS      || '',
    labels:           plan.labels           || plan.labelType    || '',
    packingSpec:      plan.packingSpec      || '',
    perDayCompletion: plan.perDayCompletion || '',
    femaleWorkers:    plan.femaleWorkers    || '',
    maleWorkers:      plan.maleWorkers      || '',
    remarks:          plan.remarks          || '',
  })
  const [saving, setSaving] = useState(false)
  const [multiplicationFactor, setMultiplicationFactor] = useState(1)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // When equipment is selected, auto-calc cycles if equipment has a capacity field
  function onEquipChange(eqpName) {
    set('equipment', eqpName)
    const eqp = equipList.find(e => e.equipName === eqpName)
    if (eqp?.workingVolume && plan.totalQty) {
      const cap = parseFloat(eqp.workingVolume)
      const total = parseFloat(plan.totalQty)
      if (cap > 0) {
        const cycles = Math.ceil(total / cap)
        setForm(f => ({ ...f, equipment: eqpName, noOfCycles: String(cycles), cycleBatchSize: String(cap) }))
        return
      }
    }
  }

  // Manual cycle input — recalc cycleBatchSize
  function onCyclesChange(val) {
    const n = parseInt(val) || 1
    const total = parseFloat(plan.totalQty) || 0
    setForm(f => ({ ...f, noOfCycles: String(n), cycleBatchSize: total > 0 ? String(Math.ceil(total / n)) : f.cycleBatchSize }))
  }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    try { await onSave(plan.id, form) }
    finally { setSaving(false) }
  }

  const showBotanical = section === 'BOTANICAL'
  const showPacking   = ['LIQUID','POWDER','GRANULES'].includes(section)
  const showCarrier   = ['POWDER','GRANULES'].includes(section)
  const showWorkers   = ['LIQUID','POWDER','GRANULES'].includes(section)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b flex-shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{plan.planId} — Schedule Details</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {SECTION_ICON[section]} {section} · {plan.productName} · {plan.totalQty} {plan.uom}
              {plan.diNo && <> · DI: <strong>{plan.diNo}</strong></>}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* ── Scheduling ─────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Planned Date</label>
              <input type="date" value={form.plannedDate} onChange={e => set('plannedDate', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Shift</label>
              <select value={form.shift} onChange={e => set('shift', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="">— Select —</option>
                {SHIFTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Batch Incharge</label>
              {employees.length > 0 ? (
                <select value={form.batchIncharge} onChange={e => set('batchIncharge', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                  <option value="">— Select Incharge —</option>
                  {employees.map(e => (
                    <option key={e.id} value={e.name || e.employeeName}>
                      {e.name || e.employeeName}
                    </option>
                  ))}
                </select>
              ) : (
                <input value={form.batchIncharge} onChange={e => set('batchIncharge', e.target.value)}
                  placeholder="Name of incharge"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Batch Code</label>
              <input value={form.batchCode} onChange={e => set('batchCode', e.target.value)}
                placeholder="e.g. B-2026-001"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>

          {/* ── Equipment + Cycles ─────────────────────────────────────────── */}
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">
              Equipment &amp; Cycles
              <span className="ml-2 font-normal normal-case text-gray-400">
                Total: {plan.totalQty} {plan.uom}
              </span>
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">
                  {section === 'NANO' ? 'Reactor / Vessel' : 'Equipment'} <span className="text-gray-400 font-normal">(from {section} section)</span>
                </label>
                {equipList.length > 0 ? (
                  <select value={form.equipment} onChange={e => onEquipChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
                    <option value="">— Select Equipment —</option>
                    {equipList.map(e => (
                      <option key={e.equipId || e.id} value={e.equipName}>
                        {e.equipName}{e.workingVolume ? ` (cap: ${e.workingVolume} ${plan.uom || 'kg'})` : ''}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input value={form.equipment} onChange={e => set('equipment', e.target.value)}
                    placeholder="Equipment name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                )}
              </div>
              {(section === 'POWDER' || section === 'GRANULES') && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Location / Bay</label>
                  <input value={form.location} onChange={e => set('location', e.target.value)}
                    placeholder="e.g. Bay 3"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">No. of Cycles</label>
                <input type="number" min="1" value={form.noOfCycles} onChange={e => onCyclesChange(e.target.value)}
                  className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Qty per Cycle</label>
                <input type="number" value={form.cycleBatchSize} onChange={e => set('cycleBatchSize', e.target.value)}
                  className="w-full border border-blue-300 bg-blue-50 rounded-lg px-3 py-2 text-sm font-bold text-blue-800 focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              {parseInt(form.noOfCycles) > 1 && (
                <div className="col-span-3">
                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-800">
                    📋 <strong>{form.noOfCycles} cycles</strong> of <strong>{form.cycleBatchSize} {plan.uom}</strong> each
                    → Indent will be raised for <strong>{form.noOfCycles}× the BOM quantities</strong>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Product Details (auto-filled from SO) ─────────────────────── */}
          <div className="border-t pt-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
              Product Details
              <span className="ml-2 font-normal normal-case text-gray-400">— pre-filled from Sales Order</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {showCarrier && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Carrier</label>
                  <input value={form.carrier} onChange={e => set('carrier', e.target.value)}
                    placeholder="e.g. Talc, Dextrose"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1">Specs</label>
                <input value={form.specs} onChange={e => set('specs', e.target.value)}
                  placeholder="e.g. 2×10⁹ CFU/g"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-500 mb-1">Process / Method</label>
                <input value={form.process} onChange={e => set('process', e.target.value)}
                  placeholder="Process description"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              {showBotanical && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Stage Info</label>
                  <input value={form.stageInfo} onChange={e => set('stageInfo', e.target.value)}
                    placeholder="e.g. Day 3 of 7"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              )}
            </div>
          </div>

          {/* ── Packing (auto-filled from SO item) ────────────────────────── */}
          {showPacking && (
            <div className="border-t pt-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                Packing Details
                <span className="ml-2 font-normal normal-case text-gray-400">— pre-filled from Sales Order</span>
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Unit Pack Qty</label>
                  <input type="number" value={form.unitPackQty} onChange={e => set('unitPackQty', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">No. of Units</label>
                  <input type="number" value={form.noOfUnits} onChange={e => set('noOfUnits', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Pack (PP1)</label>
                  <input value={form.pp1} onChange={e => set('pp1', e.target.value)}
                    placeholder="e.g. Pouch, Bottle"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">PP2</label>
                  <input value={form.pp2} onChange={e => set('pp2', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Secondary Pack (SP1)</label>
                  <input value={form.sp1} onChange={e => set('sp1', e.target.value)}
                    placeholder="e.g. Carton, Drum"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">No. of SP</label>
                  <input type="number" value={form.noOfSp} onChange={e => set('noOfSp', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Labels</label>
                  <input value={form.labels} onChange={e => set('labels', e.target.value)}
                    placeholder="Label type"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                {section === 'LIQUID' && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Packing Spec</label>
                    <input value={form.packingSpec} onChange={e => set('packingSpec', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                )}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Per Day Output</label>
                  <input type="number" value={form.perDayCompletion} onChange={e => set('perDayCompletion', e.target.value)}
                    placeholder="units/day"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
              {showWorkers && (
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Female Workers</label>
                    <input type="number" value={form.femaleWorkers} onChange={e => set('femaleWorkers', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Male Workers</label>
                    <input type="number" value={form.maleWorkers} onChange={e => set('maleWorkers', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Microbial SFG Availability Panel ───────────────────────────── */}
          <MicrobialSFGPanel
            plan={plan}
            multiplicationFactor={multiplicationFactor}
            onMfChange={setMultiplicationFactor}
          />

          {/* ── Remarks ────────────────────────────────────────────────────── */}
          <div className="border-t pt-3">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Remarks / Notes</label>
            <input value={form.remarks} onChange={e => set('remarks', e.target.value)}
              placeholder="Any notes for the shopfloor team…"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
        </form>

        <div className="flex gap-3 px-6 py-4 border-t flex-shrink-0">
          <button onClick={submit} disabled={saving}
            className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : '💾 Save Schedule Details'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Push Indent Confirmation Modal ────────────────────────────────────────────
function SendToScheduleModal({ plan, onConfirm, onClose, pushing }) {
  const cycles = plan.noOfCycles ? parseInt(plan.noOfCycles) :
    (plan.cycleBatchSize && plan.totalQty && parseFloat(plan.cycleBatchSize) > 0
      ? Math.ceil(parseFloat(plan.totalQty) / parseFloat(plan.cycleBatchSize))
      : 1)
  const cycleQty = plan.cycleBatchSize || plan.totalQty

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-base font-bold text-gray-900">📅 Send to Schedule</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600">
            This will create a <strong>Production Indent</strong> (RM requirements via BOM) and open a
            <strong> Production Batch</strong> entry in Production Master — ready for the shopfloor team.
          </p>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Product</span>
              <span className="font-semibold text-gray-900">{plan.productName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Section</span>
              <span className="font-semibold text-gray-900">{SECTION_ICON[plan.sectionType]} {plan.sectionType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total Qty</span>
              <span className="font-semibold text-gray-900">{plan.totalQty} {plan.uom}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Cycles</span>
              <span className="font-semibold text-indigo-700">{cycles} × {cycleQty} {plan.uom}</span>
            </div>
            {plan.equipment && (
              <div className="flex justify-between">
                <span className="text-gray-500">Equipment</span>
                <span className="font-semibold text-gray-900">{plan.equipment}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">DI No</span>
              <span className="font-semibold text-gray-900">{plan.diNo}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Batch No</span>
              <span className="font-semibold text-gray-900">{plan.batchCode || '(auto)'}</span>
            </div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-800 space-y-1">
            <div>✅ Indent raised in <strong>Indent Management</strong> — RM quantities × {cycles} cycles</div>
            <div>✅ Batch entry created in <strong>Production Master</strong> — shopfloor can proceed</div>
          </div>
          {!plan.productCode && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠️ No product code linked. BOM may not resolve — verify product exists in Product Master.
            </div>
          )}
          {!plan.equipment && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
              ⚠️ No equipment selected. Open Schedule Details first to assign equipment and confirm cycles.
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 py-4 border-t">
          <button onClick={onConfirm} disabled={pushing}
            className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2">
            {pushing ? <><span className="animate-spin">⚙️</span> Scheduling…</> : '📅 Confirm & Send to Schedule'}
          </button>
          <button onClick={onClose} className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onCancel, onSendToSchedule, onSendBom }) {
  const [open, setOpen] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState(null) // { ok, message }
  const [bomSending, setBomSending] = useState(null) // 'FORMULATION' | 'PACKING' | null
  const [bomResult, setBomResult] = useState(null)   // { type, ok, sendId }
  const rmDetails = Array.isArray(plan.rmCheckDetails) ? plan.rmCheckDetails : []

  async function handleSchedule() {
    setPushing(true)
    try {
      await onSendToSchedule(plan)
      setPushResult({ ok: true, message: `Scheduled ✅ — Indent + Production batch created` })
    } catch (err) {
      setPushResult({ ok: false, message: err.message || 'Failed to schedule' })
    } finally {
      setPushing(false)
      setShowScheduleModal(false)
    }
  }

  async function handleSendBom(bomType) {
    if (!confirm(`Send ${bomType === 'FORMULATION' ? 'Formulation' : 'Packing'} BOM to store for picking?`)) return
    setBomSending(bomType)
    setBomResult(null)
    try {
      const res = await onSendBom(plan, bomType)
      setBomResult({ type: bomType, ok: true, sendId: res?.data?.sendId })
    } catch (err) {
      setBomResult({ type: bomType, ok: false, msg: err.message || 'Failed' })
    } finally {
      setBomSending(null)
    }
  }

  return (
    <>
    {showScheduleModal && (
      <SendToScheduleModal
        plan={plan}
        onConfirm={handleSchedule}
        onClose={() => setShowScheduleModal(false)}
        pushing={pushing}
      />
    )}
    <div className={`bg-white border rounded-xl overflow-hidden ${plan.status === 'CANCELLED' ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50" onClick={() => setOpen(o => !o)}>
        {/* Section badge */}
        <span className={`text-lg mt-0.5`}>{SECTION_ICON[plan.sectionType]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="font-bold text-sm text-gray-900">{plan.planId}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_STYLE[plan.status] || 'bg-gray-100 text-gray-600'}`}>
              {plan.status}
            </span>
            {plan.rmCheckStatus && (
              <span className={`text-xs font-semibold ${RM_STATUS_STYLE[plan.rmCheckStatus]}`}>
                {RM_STATUS_ICON[plan.rmCheckStatus]} RM {plan.rmCheckStatus}
              </span>
            )}
            {plan.eqpCheckStatus && (
              <span className={`text-xs font-semibold ${EQP_STYLE[plan.eqpCheckStatus] || 'text-gray-400'}`}>
                ⚙ {plan.eqpCheckStatus}
              </span>
            )}
            {plan.autoGenerated && <span className="text-xs text-gray-400 italic">auto</span>}
          </div>
          <div className="text-sm font-medium text-gray-700 truncate">{plan.productName}</div>
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
            <span>DI: <strong className="text-gray-600">{plan.diNo}</strong></span>
            <span>Qty: <strong className="text-gray-600">{plan.totalQty} {plan.uom}</strong></span>
            <span>Date: <strong className="text-gray-600">{fmt(plan.plannedDate)}</strong></span>
            {plan.shift       && <span>Shift: <strong>{plan.shift}</strong></span>}
            {plan.batchIncharge && <span>IC: <strong>{plan.batchIncharge}</strong></span>}
            {plan.equipment   && <span>Equip: <strong>{plan.equipment}</strong></span>}
            {plan.carrier     && <span>Carrier: <strong>{plan.carrier}</strong></span>}
          </div>
        </div>
        <div className="text-xs text-gray-400 shrink-0">{open ? '▲' : '▼'}</div>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 space-y-3">
          {/* RM Check details */}
          {rmDetails.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">RM Availability</p>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-200">
                      <th className="text-left py-1 pr-3">Item</th>
                      <th className="text-right py-1 pr-3">Required</th>
                      <th className="text-right py-1 pr-3">Available</th>
                      <th className="text-center py-1">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rmDetails.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="py-1.5 pr-3 font-medium text-gray-700">
                          {r.rmName}
                          {r.roleType === 'CARRIER' && <span className="ml-1 text-purple-500 text-xs">🔄</span>}
                        </td>
                        <td className="py-1.5 pr-3 text-right">{r.required} {r.uom}</td>
                        <td className="py-1.5 pr-3 text-right">{r.available} {r.uom}</td>
                        <td className={`py-1.5 text-center font-semibold ${RM_STATUS_STYLE[r.status]}`}>
                          {RM_STATUS_ICON[r.status]}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions — status is set by shopfloor via Production Master */}
          <div className="flex flex-wrap gap-2 items-center">
            <button onClick={() => onEdit(plan)}
              className="text-xs text-blue-600 border border-blue-200 px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-50">
              ✏️ Schedule Details
            </button>
            <button onClick={() => onCancel(plan.id)}
              className="text-xs text-red-400 border border-red-100 px-3 py-1.5 rounded-lg font-semibold hover:bg-red-50">
              Cancel Plan
            </button>
            <span className="text-xs text-gray-400 italic ml-1">
              Status updated by shopfloor in Production Master
            </span>
          </div>

          {/* Send to Schedule */}
          {plan.status !== 'CANCELLED' && (
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1">
                  {pushResult ? (
                    <span className={`text-xs font-semibold px-3 py-1.5 rounded-lg ${pushResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                      {pushResult.message}
                    </span>
                  ) : (
                    <p className="text-xs text-gray-400">
                      Creates indent (RM via BOM) + opens Production batch for the shopfloor team.
                      {plan.noOfCycles > 1 && <> Indent raised for <strong>{plan.noOfCycles} cycles</strong>.</>}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => { setPushResult(null); setShowScheduleModal(true) }}
                  disabled={pushing}
                  className="shrink-0 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1.5 transition">
                  📅 Send to Schedule
                </button>
              </div>
            </div>
          )}

          {/* Send BOM to Store */}
          {plan.status !== 'CANCELLED' && (
            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">📦 Send BOM to Store for Picking</p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleSendBom('FORMULATION')}
                  disabled={!!bomSending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 flex items-center gap-1">
                  {bomSending === 'FORMULATION' ? '⏳ Sending…' : '🧪 Send Formulation BOM'}
                </button>
                <button
                  onClick={() => handleSendBom('PACKING')}
                  disabled={!!bomSending}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-violet-300 text-violet-700 bg-violet-50 hover:bg-violet-100 disabled:opacity-50 flex items-center gap-1">
                  {bomSending === 'PACKING' ? '⏳ Sending…' : '📦 Send Packing BOM'}
                </button>
                {bomResult && (
                  <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${bomResult.ok ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                    {bomResult.ok
                      ? `✅ ${bomResult.type === 'FORMULATION' ? 'Formulation' : 'Packing'} BOM sent — ${bomResult.sendId}`
                      : `❌ ${bomResult.msg}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                Store team will see this in Outward → BOM Requests and can mark items as picked.
              </p>
            </div>
          )}

          {plan.remarks && (
            <p className="text-xs text-gray-500 italic">Note: {plan.remarks}</p>
          )}
        </div>
      )}
    </div>
    </>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Planning() {
  const [plans,        setPlans]        = useState([])
  const [pendingOrders,setPendingOrders] = useState([])
  const [dashboard,    setDashboard]    = useState(null)
  const [logs,         setLogs]         = useState([])
  const [loading,      setLoading]      = useState(true)
  const [running,      setRunning]      = useState(false)
  const [editingPlan,  setEditingPlan]  = useState(null)
  const [runMsg,       setRunMsg]       = useState('')
  const [tab,          setTab]          = useState('plans')    // plans | pending | logs
  const [filterSection,setFilterSection] = useState('ALL')
  const [filterStatus, setFilterStatus]  = useState('DRAFT')
  const [filterDate,   setFilterDate]    = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = {}
      if (filterSection !== 'ALL') params.section = filterSection
      if (filterStatus  !== 'ALL') params.status  = filterStatus
      if (filterDate)               params.date    = filterDate

      const [planRes, pendRes, dashRes, logRes] = await Promise.all([
        planningApi.listPlans(params),
        planningApi.pendingOrders(),
        planningApi.dashboard(),
        planningApi.logs(),
      ])
      setPlans(planRes.data)
      setPendingOrders(pendRes.data)
      setDashboard(dashRes.data)
      setLogs(logRes.data)
    } finally {
      setLoading(false)
    }
  }, [filterSection, filterStatus, filterDate])

  useEffect(() => { load() }, [load])

  async function runEngine() {
    setRunning(true); setRunMsg('')
    try {
      const res = await planningApi.run()
      setRunMsg(`✅ Done — ${res.plansCreated} new plans created from ${res.ordersProcessed} pending orders`)
      load()
    } catch (ex) {
      setRunMsg(`❌ ${ex.message}`)
    } finally {
      setRunning(false)
    }
  }

  async function handleStatusChange(id, status) {
    await planningApi.updatePlan(id, { status })
    load()
  }

  async function handleSave(id, form) {
    await planningApi.updatePlan(id, form)
    setEditingPlan(null)
    load()
  }

  async function handleCancel(id) {
    if (!confirm('Cancel this plan? The sales order item will revert to PENDING.')) return
    await planningApi.cancelPlan(id)
    load()
  }

  async function handleSendToSchedule(plan) {
    const cycles    = plan.noOfCycles ? parseInt(plan.noOfCycles) : 1
    const cycleQty  = plan.cycleBatchSize || String(plan.totalQty)

    // 1. Create production indent (RM requirements × cycles via BOM)
    await indentApi.create({
      productCode:    plan.productCode    || '',
      productName:    plan.productName,
      batchSize:      String(plan.totalQty),
      batchNo:        plan.batchCode      || '',
      diNo:           plan.diNo           || '',
      plant:          plan.sectionType    || '',
      equipment:      plan.equipment      || '',
      cycleBatchSize: cycleQty,
      noOfCycles:     String(cycles),
    })

    // 2. Create Production Master batch entry so shopfloor can see and act on it
    try {
      await productionApi.create({
        productCode:    plan.productCode    || '',
        productName:    plan.productName,
        batchSize:      parseFloat(plan.totalQty) || 0,
        batchNo:        plan.batchCode      || '',
        diNo:           plan.diNo           || '',
        sectionType:    plan.sectionType    || '',
        equipment:      plan.equipment      || '',
        plannedDate:    plan.plannedDate    || null,
        shift:          plan.shift          || '',
        batchIncharge:  plan.batchIncharge  || '',
        noOfCycles:     cycles,
        cycleBatchSize: parseFloat(cycleQty) || 0,
        carrier:        plan.carrier        || '',
        specs:          plan.specs          || '',
        planId:         plan.planId,
      })
    } catch (prodErr) {
      // Non-fatal: indent already created, log and continue
      console.warn('Production batch create failed (indent was created):', prodErr.message)
    }

    // 3. Mark plan as scheduled
    await planningApi.updatePlan(plan.id, { status: 'IN_PROGRESS' })
    load()
  }

  async function handleSendBom(plan, bomType) {
    return await bomSendApi.create({
      planId:      plan.id,
      productCode: plan.productCode || '',
      productName: plan.productName,
      batchNo:     plan.batchCode   || '',
      diNo:        plan.diNo        || '',
      sectionType: plan.sectionType || null,
      bomType,
      totalQty:    plan.totalQty,
      uom:         'KG',
      sentBy:      'PLANNER',
    })
  }

  const dash = dashboard || {}

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Production Planning</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Auto-runs daily at 08:30 · Reads ETD from Sales Orders · Checks RM + Equipment
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={runEngine} disabled={running}
            className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
            {running ? <><span className="animate-spin">⚙️</span> Running…</> : '⚡ Run Engine Now'}
          </button>
          {dash.lastRun && (
            <p className="text-xs text-gray-400">
              Last run: {fmt(dash.lastRun.runAt)} · {dash.lastRun.trigger} · {dash.lastRun.plansCreated} plans
            </p>
          )}
        </div>
      </div>

      {runMsg && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium ${runMsg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {runMsg}
        </div>
      )}

      {/* Dashboard strip */}
      {dashboard && (
        <div className="grid grid-cols-5 gap-2 mb-5">
          {(dash.bySection || []).map(s => (
            <div key={s.section}
              className={`p-3 rounded-xl border text-center cursor-pointer transition ${filterSection === s.section ? SECTION_COLOR[s.section] : 'bg-white border-gray-200 hover:border-gray-300'}`}
              onClick={() => setFilterSection(prev => prev === s.section ? 'ALL' : s.section)}>
              <div className="text-xl">{SECTION_ICON[s.section]}</div>
              <div className="text-lg font-bold text-gray-900">{s.count}</div>
              <div className="text-xs text-gray-500">{s.section}</div>
            </div>
          ))}
        </div>
      )}

      {/* Pending orders alert */}
      {(dash.pendingOrders > 0) && (
        <div className="mb-5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <span className="text-lg">⚠️</span>
            <span><strong>{dash.pendingOrders}</strong> order item{dash.pendingOrders !== 1 ? 's' : ''} waiting to be planned</span>
          </div>
          <button onClick={() => setTab('pending')}
            className="text-xs text-amber-700 font-semibold border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100">
            View Orders
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'plans',   label: `📋 Plans (${plans.length})` },
          { key: 'pending', label: `🕐 Pending Orders (${pendingOrders.length})` },
          { key: 'logs',    label: '📜 Run History' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Plans tab ──────────────────────────────────────────────────────── */}
      {tab === 'plans' && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4 items-center">
            <select value={filterSection} onChange={e => setFilterSection(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="ALL">All Sections</option>
              {SECTIONS.map(s => <option key={s}>{s}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="ALL">All Statuses</option>
              {PLAN_STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
            <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            {filterDate && (
              <button onClick={() => setFilterDate('')} className="text-xs text-gray-500 hover:underline">Clear date</button>
            )}
          </div>

          {/* Status count bar */}
          <div className="flex flex-wrap gap-2 mb-4">
            {(dash.byStatus || []).filter(s => s.count > 0).map(s => (
              <button key={s.status} onClick={() => setFilterStatus(prev => prev === s.status ? 'ALL' : s.status)}
                className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition ${filterStatus === s.status ? STATUS_STYLE[s.status] + ' border-current' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                {s.status} ({s.count})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading plans…</div>
          ) : plans.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-medium">No plans yet</p>
              <p className="text-sm mt-1">Click "Run Engine Now" to generate plans from pending Sales Orders</p>
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map(plan => (
                <PlanCard key={plan.id} plan={plan}
                  onEdit={setEditingPlan}
                  onCancel={handleCancel}
                  onSendToSchedule={handleSendToSchedule}
                  onSendBom={handleSendBom}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Pending Orders tab ─────────────────────────────────────────────── */}
      {tab === 'pending' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-800">Orders Waiting to be Planned</h2>
            <button onClick={runEngine} disabled={running}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
              {running ? 'Running…' : '⚡ Plan All Now'}
            </button>
          </div>
          <PendingOrdersPanel orders={pendingOrders} />
        </div>
      )}

      {/* ── Logs tab ───────────────────────────────────────────────────────── */}
      {tab === 'logs' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Run Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Trigger</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Orders</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Plans Created</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Errors</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 && (
                <tr><td colSpan={5} className="text-center py-8 text-gray-400">No runs yet</td></tr>
              )}
              {logs.map(log => (
                <tr key={log.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-700">{new Date(log.runAt).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${log.trigger === 'SCHEDULED' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>
                      {log.trigger}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{log.ordersProcessed}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">{log.plansCreated}</td>
                  <td className="px-4 py-3 text-xs text-red-500">{log.errors || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit / Schedule Details modal */}
      {editingPlan && (
        <PlanEditModal
          plan={editingPlan}
          onSave={handleSave}
          onClose={() => setEditingPlan(null)}
        />
      )}
    </div>
  )
}
