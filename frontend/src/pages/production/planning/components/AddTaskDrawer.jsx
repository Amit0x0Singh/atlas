import { useState, useEffect } from 'react'
import { PLANT_CONFIG, PLANT_KEYS, SHIFTS } from '../data/plantConfig.js'
import { SK, lsLoad, lsSave, genId, sfgLoad } from '../utils/storage.js'
import { todayISO } from '../utils/date.js'
import { getNextBatchCode, generateTaskId } from '../utils/batchCode.js'
import { Button, IconButton } from '../../../../components/ui'
import { X, Save } from 'lucide-react'

// ── Form primitive helpers ────────────────────────────────────────────────────
function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  )
}
function Inp({ className = '', ...props }) {
  return (
    <input {...props}
      className={`px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-[inherit] text-gray-800 bg-white
        focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition ${className}`}
    />
  )
}
function Sel({ className = '', ...props }) {
  return (
    <select {...props}
      className={`px-3 py-2 border-[1.5px] border-gray-200 rounded-lg text-sm font-[inherit] text-gray-800 bg-white
        focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition ${className}`}
    />
  )
}
function SecLabel({ children }) {
  return (
    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider border-b border-gray-200 pb-1.5 mb-2.5 mt-4">
      {children}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AddTaskDrawer({ task, defaultDate, onSave, onClose }) {
  const isEdit = !!task

  const [plant,           setPlant]           = useState(task?.plant        || 'Nano')
  const [date,            setDate]            = useState(task?.date         || defaultDate || todayISO())
  const [diNo,            setDiNo]            = useState(task?.diNo         || '')
  const [shift,           setShift]           = useState(task?.shift        || 'General')
  const [productName,     setProductName]     = useState(task?.productName  || '')
  const [batchCode,       setBatchCode]       = useState(task?.batchCode    || '')
  const [batchHint,       setBatchHint]       = useState('')
  const [qty,             setQty]             = useState(task?.qty          || '')
  const [process,         setProcess]         = useState(task?.process      || '')
  const [incharge,        setIncharge]        = useState(task?.incharge     || '')
  const [equipment,       setEquipment]       = useState(task?.equipment    || '')
  const [location,        setLocation]        = useState(task?.location     || '')
  const [carrier,         setCarrier]         = useState(task?.carrier      || '')
  const [specs,           setSpecs]           = useState(task?.specs        || '')
  const [status,          setStatus]          = useState(task?.status       || 'Not Started')
  const [remarks,         setRemarks]         = useState(task?.remarks      || '')
  const [primaryPack,     setPrimaryPack]     = useState(task?.primaryPack     || '')
  const [inners,          setInners]          = useState(task?.inners          || '')
  const [secondaryPack,   setSecondaryPack]   = useState(task?.secondaryPack   || '')
  const [unitPackQty,     setUnitPackQty]     = useState(task?.unitPackQty     || '')
  const [noUnits,         setNoUnits]         = useState(task?.noUnits         || '')
  const [unitsPerSecPack, setUnitsPerSecPack] = useState(task?.unitsPerSecPack || '')
  const [totalSecPacks,   setTotalSecPacks]   = useState(task?.totalSecPacks   || '')
  const [labels,          setLabels]          = useState(task?.labels          || '')
  const [packAfter,       setPackAfter]       = useState(task?.packAfter       || 'YES')
  const [sfgSourceId,     setSfgSourceId]     = useState(task?.sfgSourceId     || '')
  const [sfgHint,         setSfgHint]         = useState('')

  const cfg = PLANT_CONFIG[plant]

  // Reset process / incharge when plant changes (add mode only)
  useEffect(() => {
    if (!isEdit) {
      setProcess(cfg.process[0] || '')
      setIncharge(cfg.incharge[0] || '')
      setEquipment('')
      setLocation('')
      setCarrier('')
    }
  }, [plant])

  // Auto-calculate packing units
  useEffect(() => {
    const q = parseFloat(qty) || 0
    const u = parseFloat(unitPackQty) || 0
    if (q > 0 && u > 0) {
      const nu = Math.ceil(q / u)
      setNoUnits(String(nu))
      const ups = parseFloat(unitsPerSecPack) || 0
      if (ups > 0) setTotalSecPacks(String(Math.ceil(nu / ups)))
    }
  }, [qty, unitPackQty, unitsPerSecPack])

  // Auto-suggest batch code
  useEffect(() => {
    if (!productName.trim()) return
    const result = getNextBatchCode(plant, productName.trim(), carrier, specs, date)
    setBatchCode(result.code)
    setBatchHint(result.carried
      ? '⚠ Carrying forward — previous batch still active'
      : '✓ New batch code generated')
  }, [plant, productName, carrier, specs, date])

  // SFG availability hint
  useEffect(() => {
    if (!cfg.sfgEligible || !productName.trim()) return
    const matches = sfgLoad().filter(s =>
      s.status !== 'Consumed' && s.qtyRemaining > 0 &&
      s.productName.toLowerCase() === productName.toLowerCase()
    )
    setSfgHint(matches.length > 0
      ? `✓ ${matches.length} SFG batch(es) available for "${productName}"`
      : 'No SFG stock found — will be fresh formulation/packing.')
  }, [productName, plant])

  const availableSfg = sfgLoad().filter(s => s.status !== 'Consumed' && s.qtyRemaining > 0)

  function handleSfgSelect(id) {
    setSfgSourceId(id)
    if (!id) return
    const entry = availableSfg.find(s => s.id === id)
    if (!entry) return
    setBatchCode(entry.batchCode)
    if (!qty) setQty(String(entry.qtyRemaining))
    setSfgHint(`Sourcing: ${entry.batchCode} — ${entry.qtyRemaining} ${entry.qtyUom} @ ${entry.location || '—'}`)
  }

  function handleSave() {
    if (!plant || !date || !productName.trim() || !qty || !process || !incharge) {
      alert('Fill all required fields marked with *')
      return
    }
    const batchKey = ['Powder','Granules'].includes(plant)
      ? `${productName}|${carrier}|${specs}`
      : productName

    const newTask = {
      id:       isEdit ? task.id     : genId(),
      taskId:   isEdit ? task.taskId : generateTaskId(plant, date),
      plant, date, diNo, shift,
      productName: productName.trim(),
      batchCode, batchKey,
      qty:    parseFloat(qty),
      qtyUom: cfg.qtyLabel?.match(/\((.+?)\)/)?.[1] || '',
      process, incharge, equipment, location, carrier, specs, status, remarks,
      primaryPack, inners, secondaryPack, unitPackQty, noUnits,
      unitsPerSecPack, totalSecPacks, labels,
      packAfter:    cfg.sfgEligible ? packAfter : '',
      sfgSourceId,
      sent:          isEdit ? task.sent          : false,
      timerStart:    isEdit ? task.timerStart    : null,
      timerEnd:      isEdit ? task.timerEnd      : null,
      bmrSubmitted:  isEdit ? task.bmrSubmitted  : false,
      bmrSubmittedAt:isEdit ? task.bmrSubmittedAt: null,
      sentToQc:      isEdit ? task.sentToQc      : false,
      sentToQcAt:    isEdit ? task.sentToQcAt    : null,
      createdAt:     isEdit ? task.createdAt     : new Date().toISOString(),
      updatedAt:     new Date().toISOString(),
    }

    const tasks = lsLoad(SK.tasks)
    if (isEdit) {
      const idx = tasks.findIndex(t => t.id === task.id)
      if (idx >= 0) tasks[idx] = newTask; else tasks.push(newTask)
    } else {
      tasks.push(newTask)
    }
    lsSave(SK.tasks, tasks)
    onSave(newTask)
    onClose()
  }

  const showPacking      = cfg.fields?.includes('packing')
  const showCarrier      = cfg.fields?.includes('carrier')
  const showSpecs        = cfg.fields?.includes('specs')
  const showLocation     = cfg.fields?.includes('location')
  const isFormulation    = process === 'Formulation'
  const isPacking        = process === 'Packing'
  const showPackAfterWrap = cfg.sfgEligible && isFormulation
  const showPackingFields = showPacking && (!cfg.sfgEligible || !isFormulation || packAfter !== 'NO')
  const showSfgPicker    = cfg.sfgEligible && isPacking

  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-2xl bg-white flex flex-col h-full shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white sticky top-0 z-10">
          <span className="font-bold text-base text-gray-900">
            {isEdit ? `Edit Task — ${task.taskId}` : 'Add New Task'}
          </span>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          <SecLabel>Basic Details</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Field label="Plant *">
              <Sel value={plant} onChange={e => setPlant(e.target.value)}>
                {PLANT_KEYS.map(p => <option key={p}>{p}</option>)}
              </Sel>
            </Field>
            <Field label="Date *">
              <Inp type="date" value={date} onChange={e => setDate(e.target.value)} />
            </Field>
            <Field label="DI Number">
              <Inp value={diNo} onChange={e => setDiNo(e.target.value)} placeholder="e.g. LT-26-018" />
            </Field>
            <Field label="Shift">
              <Sel value={shift} onChange={e => setShift(e.target.value)}>
                {SHIFTS.map(s => <option key={s}>{s}</option>)}
              </Sel>
            </Field>
          </div>

          <SecLabel>Product &amp; Batch</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Field label="Product Name *">
              <Inp value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Kohinoor, Trichoderma..." />
            </Field>
            <Field label="Batch Code" hint={batchHint}>
              <Inp value={batchCode} onChange={e => setBatchCode(e.target.value)} readOnly className="bg-gray-50 text-gray-500" />
            </Field>
            <Field label={cfg.qtyLabel || 'Total Qty *'}>
              <Inp type="number" step="0.001" value={qty} onChange={e => setQty(e.target.value)} placeholder="0" />
            </Field>
            <Field label="Process *">
              <Sel value={process} onChange={e => setProcess(e.target.value)}>
                {cfg.process.map(p => <option key={p}>{p}</option>)}
              </Sel>
            </Field>
          </div>

          <SecLabel>Assignment</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Field label="Batch Incharge *">
              <Sel value={incharge} onChange={e => setIncharge(e.target.value)}>
                {cfg.incharge.map(i => <option key={i}>{i}</option>)}
              </Sel>
            </Field>
            <Field label={cfg.equipLabel || 'Equipment'}>
              <Sel value={equipment} onChange={e => setEquipment(e.target.value)}>
                <option value="">— Select —</option>
                {cfg.equipment.map(e => <option key={e}>{e}</option>)}
              </Sel>
            </Field>
          </div>

          {showLocation && cfg.location && (
            <>
              <SecLabel>Location</SecLabel>
              <div className="mb-1">
                <Field label="Location *">
                  <Sel value={location} onChange={e => setLocation(e.target.value)}>
                    <option value="">— Select —</option>
                    {cfg.location.map(l => <option key={l}>{l}</option>)}
                  </Sel>
                </Field>
              </div>
            </>
          )}

          {(showCarrier || showSpecs) && (
            <>
              <SecLabel>Product Specifications</SecLabel>
              <div className="grid grid-cols-2 gap-3 mb-1">
                {showCarrier && cfg.carrier && (
                  <Field label="Carrier">
                    <Sel value={carrier} onChange={e => setCarrier(e.target.value)}>
                      <option value="">— Select —</option>
                      {cfg.carrier.map(c => <option key={c}>{c}</option>)}
                    </Sel>
                  </Field>
                )}
                {showSpecs && (
                  <Field label="Specs (CFU/g)" hint="e.g. 1.00E+09">
                    <Inp value={specs} onChange={e => setSpecs(e.target.value)} placeholder="e.g. 1.00E+09" />
                  </Field>
                )}
              </div>
            </>
          )}

          {showPackAfterWrap && (
            <>
              <SecLabel>SFG / Packing Decision</SecLabel>
              <div className="mb-3">
                <Field label="Packing Also? (this formulation batch)">
                  <Sel value={packAfter} onChange={e => setPackAfter(e.target.value)}>
                    <option value="YES">Yes — Pack immediately after formulation</option>
                    <option value="NO">No — Store as SFG for later packing</option>
                  </Sel>
                </Field>
                {packAfter === 'NO' && (
                  <p className="text-[11px] text-blue-600 mt-1 bg-blue-50 px-3 py-2 rounded-lg">
                    After BMR sign-off, the post-sieving quantity is stored as SFG for a future packing task.
                  </p>
                )}
              </div>
            </>
          )}

          {showSfgPicker && (
            <>
              <SecLabel>Pack from SFG Stock</SecLabel>
              <div className="mb-3">
                <Field label="Select SFG Batch (optional)" hint={sfgHint}>
                  <Sel value={sfgSourceId} onChange={e => handleSfgSelect(e.target.value)}>
                    <option value="">— Not from SFG —</option>
                    {availableSfg.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.productName} — {s.batchCode} — {s.qtyRemaining} {s.qtyUom} @ {s.location || '—'}
                      </option>
                    ))}
                  </Sel>
                </Field>
              </div>
            </>
          )}

          {showPackingFields && (
            <>
              <SecLabel>Packing Details</SecLabel>
              <div className="grid grid-cols-3 gap-3 mb-1">
                <Field label="Primary Pack">
                  <Sel value={primaryPack} onChange={e => setPrimaryPack(e.target.value)}>
                    <option value="">— Select —</option>
                    {(cfg.primaryPack || []).map(p => <option key={p}>{p}</option>)}
                  </Sel>
                </Field>
                {cfg.inners && (
                  <Field label="Inners">
                    <Sel value={inners} onChange={e => setInners(e.target.value)}>
                      <option value="">— Select —</option>
                      {cfg.inners.map(i => <option key={i}>{i}</option>)}
                    </Sel>
                  </Field>
                )}
                <Field label="Secondary Pack">
                  <Sel value={secondaryPack} onChange={e => setSecondaryPack(e.target.value)}>
                    <option value="">— Select —</option>
                    {(cfg.secondaryPack || []).map(s => <option key={s}>{s}</option>)}
                  </Sel>
                </Field>
                <Field label={`Unit Pack Qty (${plant === 'Liquid' ? 'L' : 'kg'})`}>
                  <Inp type="number" step="0.001" value={unitPackQty} onChange={e => setUnitPackQty(e.target.value)} placeholder="e.g. 0.1" />
                </Field>
                <Field label="No. of Units">
                  <Inp value={noUnits} readOnly className="bg-gray-50 text-gray-500" />
                </Field>
                <Field label="Units per Secondary Pack">
                  <Inp type="number" step="1" value={unitsPerSecPack} onChange={e => setUnitsPerSecPack(e.target.value)} placeholder="e.g. 100" />
                </Field>
                <Field label="Total Secondary Packs">
                  <Inp value={totalSecPacks} readOnly className="bg-gray-50 text-gray-500" />
                </Field>
                <Field label="Labels">
                  <Sel value={labels} onChange={e => setLabels(e.target.value)}>
                    <option value="">— Select —</option>
                    {(cfg.labels || []).map(l => <option key={l}>{l}</option>)}
                  </Sel>
                </Field>
              </div>
            </>
          )}

          <SecLabel>Status &amp; Notes</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <Field label="Status">
              <Sel value={status} onChange={e => setStatus(e.target.value)}>
                {(cfg.statuses || []).map(s => <option key={s}>{s}</option>)}
              </Sel>
            </Field>
            <Field label="Remarks / Instructions">
              <Inp value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Notes for the plant team..." />
            </Field>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-white sticky bottom-0 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Save} onClick={handleSave}>
            {isEdit ? 'Update Task' : 'Save Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}
