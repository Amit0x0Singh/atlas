import { useState, useEffect } from 'react'
import { PLANT_CONFIG, PLANT_KEYS, SHIFTS } from '../../../data/plantConfig.js'
import './AddTaskDrawer.css'
import { sfgLoad } from '../../../utils/storage.js'
import { todayISO } from '../../../utils/date.js'
import { generateTaskId } from '../../../utils/batchCode.js'
import { planTasksApi } from '../../../../../../api/production.js'
import { Button, IconButton } from '../../../../../../components/ui'
import { X, Save } from 'lucide-react'
import { Field, Inp, Sel, SecLabel } from '../components/FormFields.jsx'
import AutocompleteInput from '../components/AutocompleteInput.jsx'
import DiPickerSection from '../components/DiPickerSection.jsx'
import PackingDetailsSection from '../components/PackingDetailsSection.jsx'
import AssignmentAndExtrasSection from '../components/AssignmentAndExtrasSection.jsx'

const SECTION_TO_PLANT = {
  NANO: 'Nano', BOTANICAL: 'Botanical',
  LIQUID: 'Liquid', POWDER: 'Powder', GRANULES: 'Granules',
}

export default function AddTaskDrawer({ task, defaultDate, onSave, onClose }) {
  const isEdit = !!task

  const [plant,           setPlant]           = useState(task?.plant        || 'Nano')
  const [date,            setDate]            = useState(task?.date         || defaultDate || todayISO())
  const [diNo,            setDiNo]            = useState(task?.diNo         || '')
  const [shift,           setShift]           = useState(task?.shift        || 'General')
  const [productName,     setProductName]     = useState(task?.productName  || '')
  const [batchCode,       setBatchCode]       = useState(task?.batchCode    || '')
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

  // DI → product picker
  const [diItems,        setDiItems]        = useState([])
  const [loadingDiItems, setLoadingDiItems] = useState(false)
  const [packingInfo,    setPackingInfo]    = useState(null) // packing details from SO after DI selection

  // Live data from backend
  const [equipmentList, setEquipmentList] = useState([])
  const [saving,        setSaving]        = useState(false)
  const [saveErr,       setSaveErr]       = useState('')

  const cfg = PLANT_CONFIG[plant]

  // Load equipment from backend when plant changes
  useEffect(() => {
    planTasksApi.searchEquipment(plant)
      .then(r => setEquipmentList((r.data || []).map(e => e.equipName)))
      .catch(() => setEquipmentList(cfg.equipment || []))
  }, [plant])

  // Reset process / incharge / equipment when plant changes (add mode only)
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

  async function handleDiSelect(so) {
    setDiNo(so.diNumber)
    // Auto-fill plant from sectionName
    if (so.sectionName) {
      const autoPlant = SECTION_TO_PLANT[so.sectionName.toUpperCase()]
      if (autoPlant && PLANT_KEYS.includes(autoPlant)) setPlant(autoPlant)
    }
    // Fetch all products for this DI
    setDiItems([])
    setLoadingDiItems(true)
    try {
      const r = await planTasksApi.getSalesOrderItems(so.diNumber)
      const items = r.data || []
      if (items.length === 1) {
        applyDiItem(items[0])
      } else {
        setDiItems(items)
      }
    } catch { /* ignore */ }
    finally { setLoadingDiItems(false) }
  }

  function applyDiItem(item) {
    setProductName(item.productName)
    if (item.orderQty) setQty(String(item.orderQty))
    if (item.sectionName) {
      const autoPlant = SECTION_TO_PLANT[item.sectionName.toUpperCase()]
      if (autoPlant && PLANT_KEYS.includes(autoPlant)) setPlant(autoPlant)
    }
    if (item.primaryPack)   setPrimaryPack(item.primaryPack)
    if (item.secondaryPack) setSecondaryPack(item.secondaryPack)
    if (item.unitPackQty)   setUnitPackQty(String(item.unitPackQty))
    if (item.labelType)     setLabels(item.labelType)
    setPackingInfo({ primaryPack: item.primaryPack, secondaryPack: item.secondaryPack, unitPackQty: item.unitPackQty, labelType: item.labelType })
    setDiItems([])
  }

  async function handleSave() {
    if (!plant || !date || !productName.trim() || !qty || !process || !incharge) {
      setSaveErr('Fill all required fields marked with *')
      return
    }
    setSaving(true)
    setSaveErr('')
    try {
      const taskId = isEdit ? task.taskId : generateTaskId(plant, date)
      const batchKey = ['Powder', 'Granules'].includes(plant)
        ? `${productName}|${carrier}|${specs}`
        : productName

      const payload = {
        taskId,
        plant, date, diNo, shift,
        productName: productName.trim(),
        batchCode: batchCode || `${plant.slice(0,2).toUpperCase()}-${date.replace(/-/g,'')}-${Math.random().toString(36).slice(2,5).toUpperCase()}`,
        batchKey,
        qty: parseFloat(qty),
        qtyUom: cfg.qtyLabel?.match(/\((.+?)\)/)?.[1] || '',
        process, incharge, equipment, location, carrier, specs, status, remarks,
        primaryPack, inners, secondaryPack, unitPackQty, noUnits,
        unitsPerSecPack, totalSecPacks, labels,
        packAfter: cfg.sfgEligible ? packAfter : '',
        sfgSourceId,
        sent: isEdit ? task.sent : false,
        timerStart: isEdit ? task.timerStart : null,
        timerEnd: isEdit ? task.timerEnd : null,
        bmrSubmitted: isEdit ? task.bmrSubmitted : false,
        bmrSubmittedAt: isEdit ? task.bmrSubmittedAt : null,
        sentToQc: isEdit ? task.sentToQc : false,
        sentToQcAt: isEdit ? task.sentToQcAt : null,
      }

      let saved
      if (isEdit) {
        const r = await planTasksApi.update(task.id, payload)
        saved = r.data
      } else {
        const r = await planTasksApi.create(payload)
        saved = r.data
      }
      onSave(saved)
      onClose()
    } catch (e) {
      setSaveErr(e.response?.data?.error || e.message)
    } finally {
      setSaving(false)
    }
  }

  const showPacking       = cfg.fields?.includes('packing')
  const showCarrier       = cfg.fields?.includes('carrier')
  const showSpecs         = cfg.fields?.includes('specs')
  const showLocation      = cfg.fields?.includes('location')
  const isFormulation     = process === 'Formulation'
  const isPacking         = process === 'Packing'
  const showPackAfterWrap = cfg.sfgEligible && isFormulation
  const showPackingFields = showPacking && (!cfg.sfgEligible || !isFormulation || packAfter !== 'NO')
  const showSfgPicker     = cfg.sfgEligible && isPacking

  // Effective equipment list: backend first, fallback to config
  const effectiveEquipment = equipmentList.length > 0 ? equipmentList : (cfg.equipment || [])

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white rounded-2xl flex flex-col shadow-2xl overflow-hidden"
           style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-white z-10 rounded-t-2xl">
          <span className="font-bold text-base text-gray-900">
            {isEdit ? `Edit Task — ${task.taskId}` : 'Add New Task'}
          </span>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {saveErr && (
            <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{saveErr}</div>
          )}

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
            <DiPickerSection
              diNo={diNo}
              onDiNoChange={v => { setDiNo(v); if (!v.trim()) { setDiItems([]); setPackingInfo(null) } }}
              onDiSelect={handleDiSelect}
              diItems={diItems}
              loadingDiItems={loadingDiItems}
              onPickDiItem={applyDiItem}
              packingInfo={packingInfo}
            />
            <Field label="Shift">
              <Sel value={shift} onChange={e => setShift(e.target.value)}>
                {SHIFTS.map(s => <option key={s}>{s}</option>)}
              </Sel>
            </Field>
          </div>

          <SecLabel>Product &amp; Batch</SecLabel>
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Field label="Product Name *" hint="Type to search product master">
              <AutocompleteInput
                value={productName}
                onChange={setProductName}
                onSelect={p => setProductName(p.productName)}
                fetchFn={q => planTasksApi.searchProducts(q, plant)}
                placeholder="e.g. Kohinoor, Trichoderma..."
                renderOption={p => (
                  <div>
                    <span className="font-semibold">{p.productName}</span>
                    {p.productCode && <span className="text-gray-400 ml-2 font-mono text-[11px]">{p.productCode}</span>}
                  </div>
                )}
              />
            </Field>
            <Field label="Batch Code">
              <Inp value={batchCode} onChange={e => setBatchCode(e.target.value)} placeholder="Auto-generated if blank" />
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

          <AssignmentAndExtrasSection
            cfg={cfg}
            incharge={incharge} setIncharge={setIncharge}
            equipment={equipment} setEquipment={setEquipment} effectiveEquipment={effectiveEquipment}
            showLocation={showLocation} location={location} setLocation={setLocation}
            showCarrier={showCarrier} carrier={carrier} setCarrier={setCarrier}
            showSpecs={showSpecs} specs={specs} setSpecs={setSpecs}
            showPackAfterWrap={showPackAfterWrap} packAfter={packAfter} setPackAfter={setPackAfter}
            showSfgPicker={showSfgPicker} sfgSourceId={sfgSourceId} onSfgSelect={handleSfgSelect}
            sfgHint={sfgHint} availableSfg={availableSfg}
          />

          {showPackingFields && (
            <PackingDetailsSection
              cfg={cfg} plant={plant}
              primaryPack={primaryPack} setPrimaryPack={setPrimaryPack}
              inners={inners} setInners={setInners}
              secondaryPack={secondaryPack} setSecondaryPack={setSecondaryPack}
              unitPackQty={unitPackQty} setUnitPackQty={setUnitPackQty}
              noUnits={noUnits}
              unitsPerSecPack={unitsPerSecPack} setUnitsPerSecPack={setUnitsPerSecPack}
              totalSecPacks={totalSecPacks}
              labels={labels} setLabels={setLabels}
            />
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
        <div className="px-6 py-4 border-t bg-white flex justify-end gap-3 rounded-b-2xl">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
            {saving ? 'Saving…' : isEdit ? 'Update Task' : 'Save Task'}
          </Button>
        </div>
      </div>
    </div>
  )
}
