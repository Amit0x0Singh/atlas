import { useEffect, useMemo, useState } from 'react'
import { Save, X, RotateCcw } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'
import { microbialSfgApi } from '../../../../../api/microbial.js'
import { deriveTypeCode, fmtDate } from '../../utils/format.js'
import { useAvailableSlots } from '../../../../../hooks/microbial/useMicrobialStorage.js'
import MicrobeAutocomplete from '../shared/MicrobeAutocomplete.jsx'
import ContainerChooserModal from './ContainerChooserModal.jsx'

const EMPTY_FORM = {
  microbe_id: '', microbe_code: '', microbe_name: '',
  microbe_type: '', type_code: '',
  mode: 'new', container_id: '', container_code: '', is_reactivating: false, addto_info: null,
  inhouse_cfu_per_g: '', biomass_batch_code: '', date_of_harvest: '',
  moisture: '', shelf_life_days: '',
  pouch_nos: '', pouch_qty: '',
  received_by: '', remarks: '',
  fill_status: 'PARTIAL',
  rack: '', shelf: '', side: '', position: '',
}

const MICROBE_TYPE_OPTIONS = ['Biomass', 'SDP']

const RACKS = Array.from({ length: 15 }, (_, i) => i + 1)
const SHELVES = Array.from({ length: 8 }, (_, i) => i + 1)
const SIDES = ['B', 'F']
const POSITIONS = ['L', 'M', 'R']

export default function InwardFormModal({ open, onClose, microbes, recentRecords, onSave, saving }) {
  const [form, setForm] = useState(EMPTY_FORM)
  const [showChooser, setShowChooser] = useState(false)
  const [chooserContainers, setChooserContainers] = useState([])
  const [chooserNextCode, setChooserNextCode] = useState(null)
  const [prevEntry, setPrevEntry] = useState(null)
  const [showPrevPanel, setShowPrevPanel] = useState(false)

  const { data: availableSlots = [] } = useAvailableSlots(undefined, open)
  const availableSet = useMemo(() => new Set(availableSlots.map((s) => s.slot_code)), [availableSlots])
  const needsSlot = form.mode === 'new' || form.is_reactivating
  const chosenSlotCode = form.rack && form.shelf && form.side && form.position
    ? `R${String(form.rack).padStart(2, '0')}-S${form.shelf}-${form.side}-${form.position}`
    : null
  const slotTaken = chosenSlotCode && !availableSet.has(chosenSlotCode)

  useEffect(() => {
    if (open) { setForm(EMPTY_FORM); setPrevEntry(null); setShowPrevPanel(false) }
  }, [open])

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }))

  const expiryDate = useMemo(() => {
    if (!form.date_of_harvest || !form.shelf_life_days) return null
    const d = new Date(form.date_of_harvest)
    d.setDate(d.getDate() + Number(form.shelf_life_days))
    return d
  }, [form.date_of_harvest, form.shelf_life_days])

  const totalQtyKg = useMemo(() => {
    const n = parseFloat(form.pouch_nos) || 0
    const q = parseFloat(form.pouch_qty) || 0
    return n * q > 0 ? n * q : 0
  }, [form.pouch_nos, form.pouch_qty])

  const fetchNextCode = async (microbeCode, typeCode) => {
    if (!microbeCode || !typeCode) return null
    const n = await microbialSfgApi.nextContainerCode({ microbe_code: microbeCode, type_code: typeCode })
    return n?.data?.next_code || null
  }

  const handleMicrobeSelect = async (m) => {
    setForm((p) => ({ ...p, microbe_id: m?.microbeId || '', microbe_code: m?.microbeCode || '', microbe_name: m?.microbeName || '', mode: 'new', container_id: '', is_reactivating: false, rack: '', shelf: '', side: '', position: '' }))
    if (m) {
      // Previous entry lookup — most recent inward record for this microbe.
      const matches = recentRecords.filter((r) => r.microbe_code === m.microbeCode).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      setPrevEntry(matches[0] || null)
    } else {
      setPrevEntry(null)
    }
    setShowPrevPanel(false)
    if (m && form.type_code) {
      const nc = await fetchNextCode(m.microbeCode, form.type_code)
      if (nc) setForm((p) => ({ ...p, container_code: nc }))
    }
  }

  const handleTypeChange = async (e) => {
    const label = e.target.value
    const typeCode = deriveTypeCode(label)
    setForm((p) => ({ ...p, microbe_type: label, type_code: typeCode, mode: 'new', container_id: '', is_reactivating: false, rack: '', shelf: '', side: '', position: '' }))
    if (form.microbe_code && typeCode) {
      const nc = await fetchNextCode(form.microbe_code, typeCode)
      if (nc) setForm((p) => ({ ...p, container_code: nc }))
    }
  }

  const openChooser = async () => {
    if (!form.microbe_code || !form.type_code) { alert('Select microbe name and type first'); return }
    const [list, nc] = await Promise.all([
      microbialSfgApi.listContainers({ microbe_code: form.microbe_code, type_code: form.type_code }),
      fetchNextCode(form.microbe_code, form.type_code),
    ])
    setChooserContainers(list?.data || [])
    setChooserNextCode(nc)
    setShowChooser(true)
  }

  const chooseExisting = (c) => {
    setForm((p) => ({
      ...p,
      mode: 'addto', container_id: c.container_id, container_code: c.container_code, is_reactivating: !!c.inactive,
      addto_info: c, rack: '', shelf: '', side: '', position: '',
    }))
    setShowChooser(false)
  }

  const chooseNew = () => {
    setForm((p) => ({ ...p, mode: 'new', container_id: '', container_code: chooserNextCode || p.container_code, is_reactivating: false, addto_info: null, rack: '', shelf: '', side: '', position: '' }))
    setShowChooser(false)
  }

  const fillFromPrev = () => {
    if (!prevEntry) return
    setForm((p) => ({
      ...p,
      biomass_batch_code: prevEntry.biomass_batch_code || '',
      date_of_harvest: prevEntry.date_of_harvest ? prevEntry.date_of_harvest.slice(0, 10) : '',
      inhouse_cfu_per_g: prevEntry.inhouse_cfu_per_g || '',
      moisture: prevEntry.moisture ?? '',
      shelf_life_days: prevEntry.shelf_life_days ?? '',
      pouch_qty: prevEntry.pouch_qty ?? '',
      received_by: prevEntry.received_by || '',
    }))
    setShowPrevPanel(false)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (needsSlot && slotTaken) { alert(`Slot ${chosenSlotCode} is already occupied — pick a different one.`); return }
    if (needsSlot && !chosenSlotCode) { alert('Select a storage slot (Rack / Shelf / Side / Position).'); return }
    if (!totalQtyKg) { alert('Enter No. of Pouches and Qty per Pouch.'); return }

    onSave({
      container_id: form.mode === 'addto' ? form.container_id : null,
      new_container_code: form.mode === 'new' ? form.container_code : null,
      microbe_id: form.microbe_id, microbe_code: form.microbe_code, microbe_name: form.microbe_name,
      microbe_type: form.microbe_type, type_code: form.type_code,
      inhouse_cfu_per_g: parseFloat(form.inhouse_cfu_per_g),
      biomass_batch_code: form.biomass_batch_code, date_of_harvest: form.date_of_harvest,
      total_qty_kg: totalQtyKg,
      pouch_nos: parseInt(form.pouch_nos) || null,
      pouch_qty: parseFloat(form.pouch_qty) || null,
      received_by: form.received_by || null,
      remarks: form.remarks || null,
      moisture: form.moisture ? parseFloat(form.moisture) : null,
      shelf_life_days: form.shelf_life_days ? parseInt(form.shelf_life_days) : null,
      fill_status: form.fill_status,
      rack: needsSlot && form.rack ? Number(form.rack) : null,
      shelf: needsSlot && form.shelf ? Number(form.shelf) : null,
      side: needsSlot ? (form.side || null) : null,
      position: needsSlot ? (form.position || null) : null,
    })
  }

  return (
    <Modal open={open} onClose={onClose} size="full">
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-5">New Microbial Inward Entry</h2>
        <form onSubmit={handleSubmit}>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Microbe Identity</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Microbe Name *</label>
              <MicrobeAutocomplete value={form.microbe_name} microbes={microbes} onSelect={handleMicrobeSelect} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Microbe Code</label>
              <input className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-500 outline-none" value={form.microbe_code} readOnly />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Microbe Type *</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                value={form.microbe_type} onChange={handleTypeChange} required
              >
                <option value="">— Select type —</option>
                {MICROBE_TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2 mt-5">Container Assignment</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-2">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Container Code *</label>
              <div className="flex gap-2 items-center">
                <input className="flex-1 border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-700 outline-none" value={form.container_code} readOnly placeholder="Auto-assigned on microbe & type selection" />
                <Button type="button" variant="outline-gray" size="sm" onClick={openChooser}>📦 Change</Button>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                {form.mode === 'addto' ? `✓ Adding new batch to: ${form.container_code}${form.is_reactivating ? ' — will reactivate on save' : ''}` : 'Auto-assigned — click Change to use an existing container instead'}
              </p>
            </div>
          </div>

          {form.mode === 'addto' && form.addto_info && (
            <div className={`rounded-lg p-3 mb-4 text-xs ${form.is_reactivating ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'bg-green-50 ring-1 ring-inset ring-green-200'}`}>
              <div className={`font-bold mb-1 ${form.is_reactivating ? 'text-amber-800' : 'text-green-800'}`}>
                {form.is_reactivating ? '⏸ Currently Inactive — will reactivate on save' : '✓ Adding new batch to existing container'}
              </div>
              <div className={form.is_reactivating ? 'text-amber-700' : 'text-green-700'}>
                {form.addto_info.microbe_name} {form.addto_info.microbe_type} · Current balance: <strong>{Number(form.addto_info.current_qty_kg).toFixed(3)} kg</strong>
                {!form.is_reactivating && <> · Location: <strong>{form.addto_info.location || '—'}</strong></>}
              </div>
              <button type="button" className="mt-1.5 underline text-gray-500" onClick={chooseNew}>← Change</button>
            </div>
          )}

          {needsSlot && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Storage Slot * <span className="font-normal normal-case text-gray-400">(Rack-Shelf-Side-Position)</span></label>
              <div className="grid grid-cols-4 gap-2">
                <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.rack} onChange={(e) => set('rack', e.target.value)} required>
                  <option value="">Rack</option>
                  {RACKS.map((r) => <option key={r} value={r}>Rack {String(r).padStart(2, '0')}</option>)}
                </select>
                <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.shelf} onChange={(e) => set('shelf', e.target.value)} required>
                  <option value="">Shelf</option>
                  {SHELVES.map((s) => <option key={s} value={s}>Shelf {s}</option>)}
                </select>
                <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.side} onChange={(e) => set('side', e.target.value)} required>
                  <option value="">Side</option>
                  {SIDES.map((s) => <option key={s} value={s}>{s === 'B' ? 'Back' : 'Front'}</option>)}
                </select>
                <select className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={form.position} onChange={(e) => set('position', e.target.value)} required>
                  <option value="">Position</option>
                  {POSITIONS.map((p) => <option key={p} value={p}>{p === 'L' ? 'Left' : p === 'M' ? 'Middle' : 'Right'}</option>)}
                </select>
              </div>
              {chosenSlotCode && (
                <p className={`text-[11px] mt-1.5 font-semibold ${slotTaken ? 'text-red-600' : 'text-green-700'}`}>
                  {slotTaken ? `⚠ ${chosenSlotCode} is already occupied — choose another slot` : `✓ ${chosenSlotCode} is free`}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-5 mb-2">
            <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">Batch Details <span className="font-normal normal-case text-gray-400">(unique per inward — same container can have multiple batches)</span></div>
            {prevEntry && !showPrevPanel && (
              <Button type="button" variant="outline-gray" size="xs" icon={RotateCcw} onClick={() => setShowPrevPanel(true)}>Use Previous Entry</Button>
            )}
          </div>

          {showPrevPanel && prevEntry && (
            <div className="bg-green-50 ring-1 ring-inset ring-green-200 rounded-lg p-3 mb-3">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-bold text-green-800">↩ Previous entry for {form.microbe_name}</div>
                <button type="button" onClick={() => setShowPrevPanel(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs mb-3">
                {[
                  ['Batch Code', prevEntry.biomass_batch_code || '—'],
                  ['Harvest Date', fmtDate(prevEntry.date_of_harvest)],
                  ['CFU/g', prevEntry.inhouse_cfu_per_g || '—'],
                  ['Moisture (%)', prevEntry.moisture != null ? `${prevEntry.moisture}%` : '—'],
                  ['Shelf Life (days)', prevEntry.shelf_life_days || '—'],
                  ['Qty/Pouch (kg)', prevEntry.pouch_qty || '—'],
                ].map(([l, v]) => (
                  <div key={l} className="bg-white border border-green-200 rounded-md px-2.5 py-1.5">
                    <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide">{l}</div>
                    <div className="text-xs font-semibold text-gray-800">{v}</div>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="success" size="xs" onClick={fillFromPrev}>✓ Fill from this</Button>
                <Button type="button" variant="outline-gray" size="xs" onClick={() => setShowPrevPanel(false)}>Cancel</Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Biomass Batch Code *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. BB-2026-001" value={form.biomass_batch_code} onChange={(e) => set('biomass_batch_code', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Date of Harvest *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="date" value={form.date_of_harvest} onChange={(e) => set('date_of_harvest', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Inhouse CFU/g *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" min="0" step="any" placeholder="e.g. 5e10" value={form.inhouse_cfu_per_g} onChange={(e) => set('inhouse_cfu_per_g', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Moisture (%)</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" min="0" max="100" step="0.01" value={form.moisture} onChange={(e) => set('moisture', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Shelf Life (days) *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" min="1" value={form.shelf_life_days} onChange={(e) => set('shelf_life_days', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Expiry Date</label>
              <input className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-600 outline-none" readOnly value={expiryDate ? expiryDate.toISOString().slice(0, 10) : ''} placeholder="Auto-computed" />
            </div>
          </div>

          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wide mb-2">Quantity</div>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">No. of Pouches *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" min="1" value={form.pouch_nos} onChange={(e) => set('pouch_nos', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Qty per Pouch (kg) *</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" step="0.001" min="0" value={form.pouch_qty} onChange={(e) => set('pouch_qty', e.target.value)} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Total Qty (kg)</label>
              <input className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 outline-none" readOnly value={totalQtyKg ? totalQtyKg.toFixed(4) : ''} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Received By</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Your name" value={form.received_by} onChange={(e) => set('received_by', e.target.value)} />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Remarks</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" placeholder="Optional notes" value={form.remarks} onChange={(e) => set('remarks', e.target.value)} />
          </div>

          <div className="flex gap-3 mt-2">
            <Button type="submit" variant="primary" icon={Save} disabled={saving || (needsSlot && slotTaken)} loading={saving}>{saving ? 'Saving…' : 'Save Inward Entry'}</Button>
            <Button type="button" variant="secondary" icon={X} onClick={onClose}>Cancel</Button>
          </div>
        </form>
      </div>

      <ContainerChooserModal
        open={showChooser}
        onClose={() => setShowChooser(false)}
        microbeName={form.microbe_name}
        typeLabel={form.microbe_type}
        containers={chooserContainers}
        nextCode={chooserNextCode}
        onChooseExisting={chooseExisting}
        onChooseNew={chooseNew}
      />
    </Modal>
  )
}
