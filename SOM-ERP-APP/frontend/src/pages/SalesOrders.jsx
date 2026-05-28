import { useState, useEffect, useCallback, useRef } from 'react'
import { salesOrderApi, productApi, customerProfileApi, cpProfileApi } from '../api/client'

// ── Constants ─────────────────────────────────────────────────────────────────
const ORDER_TYPES   = ['DOMESTIC', 'EXPORT', 'SAMPLE']
const PRIORITIES    = ['MODERATE', 'URGENT', 'VERY_URGENT']
const STATUSES      = ['PENDING', 'PLANNED', 'UNDER_PRODUCTION', 'PACKED', 'IN_INVENTORY', 'READY_TO_DISPATCH', 'DISPATCHED']
const SECTIONS      = ['NANO', 'BOTANICAL', 'LIQUID', 'POWDER', 'GRANULES']
const UOMS          = ['KG', 'LTR', 'GM', 'ML', 'NOS']

const CARRIER_OPTIONS = [
  '', 'Dextrose', 'Talc', 'Lactose', 'HSCAS', 'China Clay',
  'Diatomaceous Earth', 'LSP', 'Precipitated CaCO3', 'Silica',
]
const PRIMARY_PACKING = [
  '', 'LD Pouch', 'AL Pouch', 'HDPE Jar',
  '100ml Bottle (Round)', '100ml Bottle (Regular)', '100ml Bottle (Triangle)',
  '200ml Bottle (Round)', '200ml Bottle (Regular)', '200ml Bottle (Triangle)',
  '500ml Bottle (Round)', '500ml Bottle (Regular)', '500ml Bottle (Triangle)',
  '1L Bottle (Round)', '1L Bottle (Regular)', '1L Bottle (Triangle)',
  '__CUSTOM__',
]
const SECONDARY_PACKING = [
  '', 'W-CBB', 'B-CBB', 'OMB 30 (30kg Drum)', 'OMB 50 (50kg Drum)',
  '25Kg HDPE Bag', '50Kg HDPE Bag', 'Cartons', '25L Jerry Can', '50L Barrel',
  '5L Can', '10L Can', 'Others', '__CUSTOM__',
]
const LABEL_TYPES = [
  { value: '',             label: '— Select —' },
  { value: 'CUSTOMER',    label: 'Customer Label' },
  { value: 'COMPUTER',    label: 'Computer Label' },
  { value: 'RETAIL',      label: 'Retail Label' },
  { value: 'PACKING_SLIP',label: 'Packing Slip' },
]
// Only CUSTOMER / COMPUTER / RETAIL need batch/date/MRP details
const LABEL_NEEDS_DETAILS = new Set(['CUSTOMER', 'COMPUTER', 'RETAIL'])

const PRIORITY_STYLE = {
  MODERATE:   'bg-gray-100 text-gray-600',
  URGENT:     'bg-orange-100 text-orange-700',
  VERY_URGENT:'bg-red-100 text-red-700',
}
const STATUS_STYLE = {
  PENDING:             'bg-yellow-100 text-yellow-700',
  PLANNED:             'bg-blue-100 text-blue-700',
  UNDER_PRODUCTION:    'bg-indigo-100 text-indigo-700',
  PACKED:              'bg-purple-100 text-purple-700',
  IN_INVENTORY:        'bg-teal-100 text-teal-700',
  READY_TO_DISPATCH:   'bg-green-100 text-green-700',
  DISPATCHED:          'bg-gray-100 text-gray-500',
}
const STATUS_LABELS = {
  PENDING:             'Pending',
  PLANNED:             'Planned',
  UNDER_PRODUCTION:    'Under Production',
  PACKED:              'Packed',
  IN_INVENTORY:        'In Inventory',
  READY_TO_DISPATCH:   'Ready to Dispatch',
  DISPATCHED:          'Dispatched',
}

const BRAND = '#1a4a22'

// ─────────────────────────────────────────────────────────────────────────────
// Batch number helpers
// ─────────────────────────────────────────────────────────────────────────────
// Parse "AQ260501" → { prefix:'AQ', yy:'26', mm:'05', seq:'01', full:'AQ260501' }
function parseBatch(batchNo) {
  if (!batchNo) return null
  const m = batchNo.match(/^([A-Za-z]+)(\d{2})(\d{2})(\d{2,3})$/)
  if (!m) return null
  return { prefix: m[1], yy: m[2], mm: m[3], seq: m[4] }
}

// Suggest next batch: keep prefix, update YYMM to today, increment seq if same month
function suggestNextBatch(lastBatchNo) {
  const p = parseBatch(lastBatchNo)
  if (!p) return lastBatchNo || ''
  const now   = new Date()
  const yy    = String(now.getFullYear()).slice(-2)
  const mm    = String(now.getMonth() + 1).padStart(2, '0')
  const isSameMonth = p.yy === yy && p.mm === mm
  const nextSeq = isSameMonth
    ? String(parseInt(p.seq) + 1).padStart(p.seq.length, '0')
    : '01'.padStart(p.seq.length, '0')
  return p.prefix + yy + mm + nextSeq
}

// Add days to a date string (YYYY-MM-DD) → YYYY-MM-DD
function addDays(dateStr, days) {
  if (!dateStr || !days) return ''
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

const BRAND_LIGHT = '#f0fdf4'

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' })
}

const SUPERSCRIPT = {'0':'0','1':'1','2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9'}
function specsDisplay(s) {
  if (!s) return '—'
  return s.replace(/([0-9.]+)\s*[x]\s*10\s*\^([0-9]+)/g, (_, c, e) => `${parseFloat(c).toFixed(2)}E+${e.padStart(2,'0')}`)
}

// ─────────────────────────────────────────────────────────────────────────────
// Inhouse product searchable dropdown
// ─────────────────────────────────────────────────────────────────────────────
function InhouseProductPicker({ value, productCode, products, onChange }) {
  const [query, setQuery] = useState(value || '')
  const [open,  setOpen]  = useState(false)
  useEffect(() => { setQuery(value || '') }, [value])

  const filtered = products.filter(p =>
    !query ||
    p.productName.toLowerCase().includes(query.toLowerCase()) ||
    (p.productCode || '').toLowerCase().includes(query.toLowerCase())
  ).slice(0, 20)

  function pick(p) { setQuery(p.productName); setOpen(false); onChange(p.productName, p.productCode) }

  return (
    <div className="relative">
      <input value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onChange(e.target.value, '') }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Search product master…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
      {productCode && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-green-600">{productCode}</span>
      )}
      {open && filtered.length > 0 && (
        <div className="absolute z-30 w-full bg-white border border-gray-200 rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
          {filtered.map(p => (
            <button key={p.productCode} type="button" onMouseDown={() => pick(p)}
              className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm flex items-center justify-between gap-2">
              <span className="font-medium text-gray-800">{p.productName}</span>
              <span className="text-xs text-gray-400 font-mono shrink-0">{p.productCode}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
// Customer name picker — searches 489 profiles, auto-fills company + orderType
// ─────────────────────────────────────────────────────────────────────────────
function CustomerNamePicker({ value, profiles, onSelect }) {
  const [query, setQuery] = useState(value || '')
  const [open,  setOpen]  = useState(false)

  useEffect(() => { setQuery(value || '') }, [value])

  const filtered = profiles.filter(p =>
    !query || p.customerName.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 12)

  // Confidence badge based on orderCount
  function badge(count) {
    if (count >= 10) return { label: 'HIGH',   cls: 'bg-green-100 text-green-700' }
    if (count >= 3)  return { label: 'MEDIUM', cls: 'bg-blue-100 text-blue-600' }
    if (count >= 1)  return { label: 'LOW',    cls: 'bg-gray-100 text-gray-500' }
    return { label: 'NEW', cls: 'bg-yellow-100 text-yellow-700' }
  }

  function pick(p) {
    setQuery(p.customerName)
    setOpen(false)
    onSelect(p.customerName, p.company, p.orderType)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); setOpen(true); onSelect(e.target.value, null, null) }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 180)}
        placeholder="Type customer name…"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
      />
      {open && (
        <div className="absolute z-40 w-full bg-white border border-gray-200 rounded-xl shadow-xl mt-1 max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-400 italic">
              New customer — will be added to memory on save
            </div>
          ) : (
            filtered.map(p => {
              const b = badge(p.orderCount)
              return (
                <button key={p.customerName} type="button" onMouseDown={() => pick(p)}
                  className="w-full text-left px-3 py-2.5 hover:bg-green-50 transition flex items-center justify-between gap-3 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">{p.customerName}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {p.company} · {p.orderType}
                    </div>
                  </div>
                  <span className={'text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ' + b.cls}>
                    {b.label}
                  </span>
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Line item row — used in booking form
// ─────────────────────────────────────────────────────────────────────────────
// Auto-calculate number of secondary packs
function calcTotalCS(totalQty, unitQty, unitsPerCS) {
  const tq = parseFloat(totalQty)
  const uq = parseFloat(unitQty)
  const up = parseInt(unitsPerCS)
  if (!tq || !uq || !up || uq <= 0 || up <= 0) return ''
  return String(Math.ceil(tq / (uq * up)))
}

// ── CustomerProductPicker: searchable dropdown from cpProfiles ───────────────
function CustomerProductPicker({ value, cpProfiles, onSelect, onChange }) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState(value || '')
  const ref = useRef(null)

  // sync search with external value
  useEffect(() => { setSearch(value || '') }, [value])

  // close on outside click
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = search.trim().length >= 1
    ? cpProfiles.filter(p => p.productName.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : cpProfiles.slice(0, 10)

  return (
    <div className="relative" ref={ref}>
      <input
        value={search}
        onChange={e => { setSearch(e.target.value); onChange(e.target.value); setOpen(true) }}
        onFocus={() => setOpen(true)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
        placeholder={cpProfiles.length > 0 ? `${cpProfiles.length} known products…` : 'Type product name'} />
      {open && filtered.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
          {filtered.map((p, i) => (
            <button key={i} type="button"
              onMouseDown={e => { e.preventDefault(); setSearch(p.productName); setOpen(false); onSelect(p) }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 flex items-center justify-between gap-2">
              <span className="font-medium text-gray-800 truncate">{p.productName}</span>
              <span className="text-xs text-gray-400 shrink-0 flex gap-1">
                {p.unitQty && <span>{p.unitQty}{p.unitUom}</span>}
                {p.primaryPack && <span>· {p.primaryPack}</span>}
                {p.labelType && <span className="text-green-600">· {p.labelType.replace('_',' ')}</span>}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function LineItemRow({ item, idx, products, cpProfiles, onChange, onRemove, onProductPicked, onCpProductPicked }) {
  const set = (k, v) => onChange(idx, { ...item, [k]: v })
  const showLabelDetails = LABEL_NEEDS_DETAILS.has(item.labelType)
  const ppIsCustom = item.unitPackType && !PRIMARY_PACKING.includes(item.unitPackType) && item.unitPackType !== ''
  const spIsCustom = item.packingType  && !SECONDARY_PACKING.includes(item.packingType) && item.packingType  !== ''

  return (
    <div className="border border-gray-200 rounded-xl p-4 space-y-4 bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Line {idx + 1}</span>
        {item._memApplied && (
          <span className="text-xs bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full">
            Memory applied
          </span>
        )}
      </div>
        <button type="button" onClick={() => onRemove(idx)} className="text-xs text-red-400 hover:underline">Remove</button>
      </div>

      {/* Product names */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            Customer Product Name *
            {cpProfiles.length > 0 && (
              <span className="ml-1.5 text-green-600 font-normal">({cpProfiles.length} known)</span>
            )}
          </label>
          <CustomerProductPicker
            value={item.customerProductName}
            cpProfiles={cpProfiles}
            onChange={v => set('customerProductName', v)}
            onSelect={profile => onCpProductPicked(idx, profile)} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Inhouse Product Name *</label>
          <InhouseProductPicker value={item.inhouseProductName} productCode={item.inhouseProductCode}
            products={products}
            onChange={(name, code) => { onChange(idx, { ...item, inhouseProductName: name, inhouseProductCode: code }); if (code) onProductPicked(idx, code) }} />
        </div>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Active Ingredient</label>
          <input value={item.activeIngredient || ''} onChange={e => set('activeIngredient', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="e.g. Bacillus subtilis" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">CFU / Specs</label>
          <input value={item.activeSpecs || ''} onChange={e => set('activeSpecs', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
            placeholder="e.g. 2x10^9 CFU/g" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Carrier</label>
          <select value={item.carrier || ''} onChange={e => set('carrier', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
            {CARRIER_OPTIONS.map(c => <option key={c} value={c}>{c || '— Select —'}</option>)}
          </select>
        </div>
      </div>

      {/* Qty + Section */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Total Qty *</label>
          <div className="flex gap-2">
            <input type="number" value={item.totalQty} onChange={e => {
              const newQty = e.target.value
              const newCS = calcTotalCS(newQty, item.unitQty, item.unitsPerCS)
              onChange(idx, { ...item, totalQty: newQty, ...(newCS ? { totalCS: newCS } : {}) })
            }}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="0" min="0" />
            <select value={item.totalUom || 'KG'} onChange={e => set('totalUom', e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {UOMS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Unit Qty (per pack)</label>
          <div className="flex gap-2">
            <input type="number" value={item.unitQty || ''} onChange={e => set('unitQty', e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. 1" min="0" />
            <select value={item.unitUom || 'KG'} onChange={e => set('unitUom', e.target.value)}
              className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {UOMS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">Section / MFG Unit</label>
          <select value={item.sectionName || ''} onChange={e => set('sectionName', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
            <option value="">— Select —</option>
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Packing */}
      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Packing</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Pack</label>
            <select value={ppIsCustom ? '__CUSTOM__' : (item.unitPackType || '')}
              onChange={e => { if (e.target.value === '__CUSTOM__') set('unitPackType', ''); else set('unitPackType', e.target.value) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {PRIMARY_PACKING.map(p => <option key={p} value={p}>{p === '__CUSTOM__' ? '+ Add Custom…' : p || '— Select —'}</option>)}
            </select>
            {ppIsCustom && (
              <input value={item.unitPackType} onChange={e => set('unitPackType', e.target.value)}
                placeholder="Type custom…" className="mt-1 w-full border border-green-300 rounded-lg px-3 py-2 text-sm" />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Secondary Pack</label>
            <select value={spIsCustom ? '__CUSTOM__' : (item.packingType || '')}
              onChange={e => { if (e.target.value === '__CUSTOM__') set('packingType', ''); else set('packingType', e.target.value) }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {SECONDARY_PACKING.map(p => <option key={p} value={p}>{p === '__CUSTOM__' ? '+ Add Custom…' : p || '— Select —'}</option>)}
            </select>
            {spIsCustom && (
              <input value={item.packingType} onChange={e => set('packingType', e.target.value)}
                placeholder="Type custom…" className="mt-1 w-full border border-green-300 rounded-lg px-3 py-2 text-sm" />
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Units / Sec. Pack</label>
            <input type="number" value={item.unitsPerCS || ''} onChange={e => {
              const newUPS = e.target.value
              const newCS = calcTotalCS(item.totalQty, item.unitQty, newUPS)
              onChange(idx, { ...item, unitsPerCS: newUPS, ...(newCS ? { totalCS: newCS } : {}) })
            }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. 10" min="0" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">No. of Sec. Packs</label>
            <input type="number" value={item.totalCS || ''} onChange={e => set('totalCS', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Auto or enter" min="0" />
          </div>
        </div>
      </div>

      {/* Label section — always show label type, hide detail fields for Packing Slip */}
      <div className="border-t border-gray-200 pt-3">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">Label Details</p>
        <div className="grid grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Label Type</label>
            <select value={item.labelType || ''} onChange={e => set('labelType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {LABEL_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
            </select>
            {item.labelType && !LABEL_NEEDS_DETAILS.has(item.labelType) && (
              <p className="mt-1 text-xs text-gray-400">No print details needed</p>
            )}
          </div>
        </div>

        {/* Batch / Date / MRP — only for CUSTOMER, COMPUTER, RETAIL */}
        {showLabelDetails && (
          <div className="mt-3 grid grid-cols-4 gap-3 bg-green-50 border border-green-100 rounded-xl p-3">
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">Batch No.</label>
              <input value={item.batchNo || ''} onChange={e => set('batchNo', e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="e.g. GAS250601" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">Mfg. Date</label>
              <input type="date" value={item.mfgDate || ''} onChange={e => {
                set('mfgDate', e.target.value)
                // Auto-recalculate EXP when MFG changes if shelf life known
                if (item._shelfLifeDays && e.target.value) {
                  set('expDate', addDays(e.target.value, item._shelfLifeDays))
                }
              }}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">Exp. Date</label>
              <input type="date" value={item.expDate || ''} onChange={e => set('expDate', e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-green-800 mb-1">MRP ()</label>
              <input type="number" value={item.mrp || ''} onChange={e => set('mrp', e.target.value)}
                className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-green-500 focus:outline-none"
                placeholder="optional" min="0" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Booking form — sales team fills this
// ─────────────────────────────────────────────────────────────────────────────
const BLANK_ITEM = {
  customerProductName:'', inhouseProductName:'', inhouseProductCode:'',
  activeIngredient:'', activeSpecs:'', carrier:'',
  sectionName:'', totalQty:'', totalUom:'KG',
  unitQty:'', unitUom:'KG', unitsPerCS:'', totalCS:'',
  unitPackType:'', packingType:'',
  labelType:'', batchNo:'', mfgDate:'', expDate:'', mrp:'',
}

function OrderForm({ initial, companies, products, profiles, onSave, onCancel, onAddCompany }) {
  const today = new Date().toISOString().split('T')[0]
  const [addingCo,  setAddingCo]  = useState(false)
  const [newCoCode, setNewCoCode] = useState('')
  const [newCoName, setNewCoName] = useState('')
  const [addCoErr,  setAddCoErr]  = useState('')
  const [savingCo,  setSavingCo]  = useState(false)

  const [hdr, setHdr] = useState({
    company: companies[0]?.code || 'SOM',
    diNo: '', customerName: '',
    orderType: 'DOMESTIC', priority: 'MODERATE',
    salesStaff: '',
    orderReceivedDate: today, estimatedDispatchDate: '',
    remarks: '',
    ...initial,
  })
  const [items, setItems] = useState(
    initial?.items?.length
      ? initial.items.map(it => ({
          ...BLANK_ITEM, ...it,
          mfgDate: it.mfgDate ? new Date(it.mfgDate).toISOString().split('T')[0] : '',
          expDate: it.expDate ? new Date(it.expDate).toISOString().split('T')[0] : '',
        }))
      : [{ ...BLANK_ITEM }]
  )
  const [saving,     setSaving]     = useState(false)
  const [err,        setErr]        = useState('')
  const [cpProfiles, setCpProfiles] = useState([])   // product profiles for current customer
  const setH = (k, v) => setHdr(h => ({ ...h, [k]: v }))

  // Load product profiles whenever customer changes
  useEffect(() => {
    if (!hdr.customerName?.trim()) { setCpProfiles([]); return }
    cpProfileApi.forCustomer(hdr.customerName.trim())
      .then(res => setCpProfiles(res.data || []))
      .catch(() => setCpProfiles([]))
  }, [hdr.customerName])

  // Apply a memory profile to a line item — shared by both lookup paths
  function applyMemoryProfile(idx, mem) {
    if (!mem) return
    const suggested = mem.lastBatchNo ? suggestNextBatch(mem.lastBatchNo) : ''
    setItems(its => its.map((it, i) => {
      if (i !== idx) return it
      const newUnitQty   = mem.unitQty    ? String(mem.unitQty)    : it.unitQty
      const newUnitUom   = mem.unitUom    || it.unitUom
      const newUnitsPerCS = mem.unitsPerCS ? String(mem.unitsPerCS) : it.unitsPerCS
      const newTotalCS   = calcTotalCS(it.totalQty, newUnitQty, newUnitsPerCS)
      const mfgDate      = it.mfgDate || new Date().toISOString().split('T')[0]
      return {
        ...it,
        activeSpecs:   mem.activeSpecs   || it.activeSpecs,
        carrier:       mem.carrier       || it.carrier,
        sectionName:   mem.sectionName   || it.sectionName,
        unitQty:       newUnitQty,
        unitUom:       newUnitUom,
        unitPackType:  mem.primaryPack   || it.unitPackType,
        packingType:   mem.secondaryPack || it.packingType,
        unitsPerCS:    newUnitsPerCS,
        totalCS:       newTotalCS        || it.totalCS,
        totalUom:      mem.totalUom      || it.totalUom,
        labelType:     mem.labelType     || it.labelType,
        mrp:           mem.mrp           ? String(mem.mrp) : it.mrp,
        batchNo:       suggested         || it.batchNo,
        mfgDate,
        expDate: mem.shelfLifeDays ? addDays(mfgDate, mem.shelfLifeDays) : it.expDate,
        _shelfLifeDays: mem.shelfLifeDays || null,
        _memApplied:    true,
      }
    }))
  }

  // Triggered when user picks from InhouseProductPicker (by productCode)
  function applyProductMemory(idx, productCode) {
    const mem = cpProfiles.find(p => p.productCode === productCode)
      || cpProfiles.find(p => p.inhouseName === productCode) // fallback by name
    applyMemoryProfile(idx, mem)
  }

  // Triggered when user picks from CustomerProductPicker (by productName)
  function applyCpProductMemory(idx, profile) {
    // profile is the full cpProfile object from the dropdown
    applyMemoryProfile(idx, profile)
    // Also fill inhouseName if profile has it
    if (profile.inhouseName || profile.productCode) {
      setItems(its => its.map((it, i) => i !== idx ? it : {
        ...it,
        inhouseProductName: profile.inhouseName || it.inhouseProductName,
        inhouseProductCode: profile.productCode  || it.inhouseProductCode,
      }))
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!hdr.diNo.trim())           return setErr('DI No. is required')
    if (!hdr.customerName.trim())   return setErr('Customer Name is required')
    if (!hdr.estimatedDispatchDate) return setErr('Estimated Dispatch Date is required')
    if (items.some(it => !it.customerProductName || !it.inhouseProductName || !it.totalQty))
      return setErr('Each line needs Customer Product Name, Inhouse Product Name and Qty')
    setSaving(true); setErr('')
    try { await onSave({ ...hdr, items }) }
    catch (ex) { setErr(ex.message) }
    finally { setSaving(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {err && <div className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg border border-red-200">{err}</div>}

      {/* Order header */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Order Details</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">DI No. *</label>
            <input value={hdr.diNo} onChange={e => setH('diNo', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="e.g. DVS/SO-25-001" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Customer Name *</label>
            <CustomerNamePicker
              value={hdr.customerName}
              profiles={profiles}
              onSelect={(name, company, orderType) => {
                setH('customerName', name)
                if (company)   setH('company', company)
                if (orderType) setH('orderType', orderType)
              }}
            />
            {hdr.customerName && profiles.find(p => p.customerName === hdr.customerName.toUpperCase()) && (
              <p className="mt-1 text-xs text-green-600">
                Auto-filled from memory
              </p>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Type *</label>
            <select value={hdr.orderType} onChange={e => setH('orderType', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {ORDER_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Company *</label>
            <select value={hdr.company} onChange={e => {
              if (e.target.value === '__ADD__') { setAddingCo(true); return }
              setAddingCo(false); setH('company', e.target.value)
            }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {companies.map(c => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
              <option value="__ADD__">+ Add New Company…</option>
            </select>
            {addingCo && (
              <div className="mt-2 bg-green-50 border border-green-200 rounded-xl p-3 space-y-2">
                <div className="flex gap-2">
                  <input value={newCoCode} onChange={e => setNewCoCode(e.target.value.toUpperCase())}
                    placeholder="Code e.g. DVS" maxLength={20}
                    className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                  <input value={newCoName} onChange={e => setNewCoName(e.target.value)}
                    placeholder="Full name"
                    className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm" />
                </div>
                {addCoErr && <p className="text-xs text-red-500">{addCoErr}</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={savingCo} onClick={async () => {
                    if (!newCoCode.trim()) return setAddCoErr('Code required')
                    setSavingCo(true); setAddCoErr('')
                    try {
                      await onAddCompany(newCoCode.trim(), newCoName.trim() || newCoCode.trim())
                      setH('company', newCoCode.trim())
                      setAddingCo(false); setNewCoCode(''); setNewCoName('')
                    } catch (ex) { setAddCoErr(ex.message) }
                    finally { setSavingCo(false) }
                  }} className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-green-800 disabled:opacity-50">
                    {savingCo ? 'Adding…' : 'Add'}
                  </button>
                  <button type="button" onClick={() => { setAddingCo(false); setH('company', companies[0]?.code || '') }}
                    className="border border-gray-300 px-3 py-1.5 rounded-lg text-xs">Cancel</button>
                </div>
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Priority</label>
            <select value={hdr.priority} onChange={e => setH('priority', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none">
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Sales Staff</label>
            <input value={hdr.salesStaff || ''} onChange={e => setH('salesStaff', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none"
              placeholder="Name of sales person" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Date</label>
            <input type="date" value={hdr.orderReceivedDate} onChange={e => setH('orderReceivedDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">Est. Dispatch Date *</label>
            <input type="date" value={hdr.estimatedDispatchDate} onChange={e => setH('estimatedDispatchDate', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none" />
          </div>
          <div className="col-span-4">
            <label className="block text-xs font-semibold text-gray-500 mb-1">Order Remarks</label>
            <textarea value={hdr.remarks || ''} onChange={e => setH('remarks', e.target.value)} rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none resize-none"
              placeholder="Special instructions, delivery notes…" />
          </div>
        </div>
        <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 text-xs text-amber-700 flex items-center gap-2">
          <span>i</span>
          <span>Invoice, batch details and dispatch info are filled in the <strong>Dispatch</strong> tab once the order reaches the inventory team.</span>
        </div>
      </div>

      {/* Line items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Product Lines</h3>
          <button type="button" onClick={() => setItems(it => [...it, { ...BLANK_ITEM }])}
            className="text-sm text-green-700 font-semibold hover:underline">+ Add Line</button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <LineItemRow key={idx} item={item} idx={idx}
              products={products}
              cpProfiles={cpProfiles}
              onChange={(i, u) => setItems(it => it.map((x, j) => j === i ? u : x))}
              onRemove={i => setItems(it => it.filter((_, j) => j !== i))}
              onProductPicked={applyProductMemory}
              onCpProductPicked={applyCpProductMemory} />
          ))}
        </div>
      </div>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving}
          className="flex-1 text-white py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50"
          style={{ background: BRAND }}>
          {saving ? 'Saving…' : initial?.id ? 'Update Order' : 'Create Sales Order'}
        </button>
        <button type="button" onClick={onCancel}
          className="flex-1 border border-gray-300 py-2.5 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch Modal — inventory/dispatch team fills this
// ─────────────────────────────────────────────────────────────────────────────
function DispatchModal({ order, onSave, onDelete, onClose }) {
  const [saving, setSaving] = useState(false)
  const setH = (k, v) => setHdr(h => ({ ...h, [k]: v }))
  const setL = (idx, k, v) => setLines(ls => ls.map((l, i) => i === idx ? { ...l, [k]: v } : l))

  const dominantStatus = order.items.every(it => it.status === 'DISPATCHED') ? 'DISPATCHED'
    : order.items.some(it => it.status === 'READY_TO_DISPATCH') ? 'READY_TO_DISPATCH'
    : order.items[0]?.status || 'PENDING'

  const [hdr, setHdr] = useState({
    orderStatus:   dominantStatus,
    dispatchDate:  order.invoiceDate ? new Date(order.invoiceDate).toISOString().split('T')[0] : '',
    salesStaff:    order.salesStaff    || '',
    dispatchedBy:  order.dispatchedBy  || '',
    remarks:       order.remarks       || '',
    invoiceNo:     order.invoiceNo     || '',
    transportName: order.transportName || '',
  })

  const [lines, setLines] = useState(
    order.items.map(it => ({
      id:             it.id,
      productName:    it.inhouseProductName || it.customerProductName,
      totalQty:       it.totalQty,
      totalUom:       it.totalUom || 'KG',
      batchNo:        it.batchNo        || '',
      invoiceNo:      it.invoiceNo      || order.invoiceNo     || '',
      invoiceDate:    it.invoiceDate    ? new Date(it.invoiceDate).toISOString().split('T')[0]
                      : order.invoiceDate ? new Date(order.invoiceDate).toISOString().split('T')[0] : '',
      transport:      order.transportName || '',
      primaryPack:    it.unitPackType   || '',
      secondaryPack:  it.packingType    || '',
      noOfSecPacks:   it.totalCS        || '',
      labelType:      it.labelType      || '',
      mrp:            it.mrp            || '',
      mfgDate:        it.mfgDate ? new Date(it.mfgDate).toISOString().split('T')[0] : '',
      expDate:        it.expDate ? new Date(it.expDate).toISOString().split('T')[0] : '',
    }))
  )

  async function save() {
    setSaving(true)
    try {
      await salesOrderApi.patchDispatch(order.id, {
        invoiceNo:     hdr.invoiceNo,
        salesStaff:    hdr.salesStaff,
        dispatchedBy:  hdr.dispatchedBy,
        transportName: hdr.transportName,
        remarks:       hdr.remarks,
        invoiceDate:   hdr.dispatchDate || null,
      })
      for (const line of lines) {
        await salesOrderApi.updateItem(line.id, {
          status:    hdr.orderStatus,
          batchNo:   line.batchNo   || null,
          mrp:       line.mrp       ? parseFloat(line.mrp) : null,
          totalCS:   line.noOfSecPacks ? parseInt(line.noOfSecPacks) : null,
          mfgDate:   line.mfgDate   || null,
          expDate:   line.expDate   || null,
        })
      }
      onSave()
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 rounded-t-2xl text-white" style={{ background: BRAND }}>
          <h2 className="font-bold text-sm tracking-wide">Order: {order.diNo} — {order.customerName}</h2>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none">x</button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Order-level dispatch fields */}
          <div className="grid grid-cols-5 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Order Status</label>
              <select value={hdr.orderStatus} onChange={e => setH('orderStatus', e.target.value)} className={inp}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Dispatch Date</label>
              <input type="date" value={hdr.dispatchDate} onChange={e => setH('dispatchDate', e.target.value)} className={inp} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Sales Staff</label>
              <input value={hdr.salesStaff} onChange={e => setH('salesStaff', e.target.value)} className={inp} placeholder="Name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Dispatched By</label>
              <input value={hdr.dispatchedBy} onChange={e => setH('dispatchedBy', e.target.value)} className={inp} placeholder="Name" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Remarks</label>
              <input value={hdr.remarks} onChange={e => setH('remarks', e.target.value)} className={inp} placeholder="Optional" />
            </div>
          </div>

          {/* Product lines */}
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Product Lines</p>
            <div className="space-y-4">
              {lines.map((line, idx) => (
                <div key={line.id} className="border border-gray-200 rounded-xl p-4 bg-gray-50">
                  <p className="text-sm font-bold mb-3" style={{ color: BRAND }}>
                    Line {idx + 1}: {line.productName}
                  </p>
                  <div className="grid grid-cols-5 gap-3 mb-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Total Qty</label>
                      <input value={line.totalQty + ' ' + line.totalUom} readOnly
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white font-semibold text-gray-700" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Batch No.</label>
                      <input value={line.batchNo} onChange={e => setL(idx, 'batchNo', e.target.value)}
                        className={inp} placeholder="e.g. GAS250601" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Invoice No.</label>
                      <input value={line.invoiceNo} onChange={e => setL(idx, 'invoiceNo', e.target.value)}
                        className={inp} placeholder="INV-001" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Invoice Date</label>
                      <input type="date" value={line.invoiceDate} onChange={e => setL(idx, 'invoiceDate', e.target.value)}
                        className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Transport</label>
                      <input value={line.transport} onChange={e => setL(idx, 'transport', e.target.value)}
                        className={inp} placeholder="Courier / truck" />
                    </div>
                  </div>
                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Primary Pack</label>
                      <input value={line.primaryPack} onChange={e => setL(idx, 'primaryPack', e.target.value)}
                        className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Secondary Pack</label>
                      <input value={line.secondaryPack} onChange={e => setL(idx, 'secondaryPack', e.target.value)}
                        className={inp} />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">No. of Sec. Packs</label>
                      <input type="number" value={line.noOfSecPacks} onChange={e => setL(idx, 'noOfSecPacks', e.target.value)}
                        className={inp} placeholder="e.g. 40" min="0" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">Label Type</label>
                      <select value={line.labelType} onChange={e => setL(idx, 'labelType', e.target.value)} className={inp}>
                        {LABEL_TYPES.map(lt => <option key={lt.value} value={lt.value}>{lt.label}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">MRP ()</label>
                      <input type="number" value={line.mrp} onChange={e => setL(idx, 'mrp', e.target.value)}
                        className={inp} placeholder="optional" min="0" />
                    </div>
                  </div>
                  {/* Mfg/Exp dates — only if label needs details */}
                  {LABEL_NEEDS_DETAILS.has(line.labelType) && (
                    <div className="mt-3 grid grid-cols-2 gap-3 bg-green-50 border border-green-100 rounded-lg p-3">
                      <div>
                        <label className="block text-xs font-semibold text-green-800 mb-1">Mfg. Date</label>
                        <input type="date" value={line.mfgDate} onChange={e => setL(idx, 'mfgDate', e.target.value)}
                          className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white" />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-green-800 mb-1">Exp. Date</label>
                        <input type="date" value={line.expDate} onChange={e => setL(idx, 'expDate', e.target.value)}
                          className="w-full border border-green-200 rounded-lg px-3 py-2 text-sm bg-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button className="text-sm text-gray-600 border border-gray-300 px-4 py-2 rounded-lg hover:bg-white flex items-center gap-2">
            View / Print Order
          </button>
          <div className="flex gap-3">
            <button onClick={save} disabled={saving}
              className="text-white px-5 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
              style={{ background: BRAND }}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button onClick={() => onDelete(order)}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-red-700">
              Delete
            </button>
            <button onClick={onClose}
              className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────────────────
export default function SalesOrders() {
  const [activeTab,     setActiveTab]     = useState('orders')  // 'orders' | 'dispatch' | 'history'
  const [orders,        setOrders]        = useState([])
  const [companies,     setCompanies]     = useState([])
  const [products,      setProducts]      = useState([])
  const [loading,       setLoading]       = useState(true)
  const [showForm,      setShowForm]      = useState(false)
  const [editing,       setEditing]       = useState(null)
  const [profiles,      setProfiles]      = useState([])
  const [dispatchOrder, setDispatchOrder] = useState(null)
  const [err,           setErr]           = useState('')
  const [search,        setSearch]        = useState('')
  const [filterStatus,  setFilterStatus]  = useState('ALL')
  const [filterCompany, setFilterCompany] = useState('ALL')
  const [dispatchFilter,setDispatchFilter]= useState('ALL')
  const [sfgAlert,      setSfgAlert]      = useState(null)   // [{productCode,productName,sfgQty,orderedQty,uom}]

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [ordRes, coRes, prodRes, profRes] = await Promise.all([
        salesOrderApi.list({}),
        salesOrderApi.companies(),
        productApi.list({}),
        customerProfileApi.list(),
      ])
      setOrders(ordRes.data)
      setCompanies(coRes.data)
      setProducts(prodRes.data || [])
      setProfiles(profRes.data || [])
    } catch (ex) { setErr(ex.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleSave(form) {
    let sfgResult = null
    if (editing) {
      await salesOrderApi.update(editing.id, form)
    } else {
      const res = await salesOrderApi.create(form)
      if (res?.sfgAvailability?.length) sfgResult = res.sfgAvailability
    }
    // Update customer-level memory
    if (form.customerName?.trim()) {
      try {
        await customerProfileApi.upsert({
          customerName: form.customerName.trim().toUpperCase(),
          company:   form.company   || '',
          orderType: form.orderType || 'DOMESTIC',
        })
      } catch (_) { /* non-critical */ }
    }
    // Update customer-product deep memory — key by customerProductName, store all fields
    if (form.customerName?.trim() && form.items?.length) {
      try {
        const itemsToSave = form.items.filter(it => it.customerProductName?.trim())
        if (itemsToSave.length > 0) {
          await cpProfileApi.upsertMany(
            form.customerName.trim(),
            itemsToSave.map(it => ({
              ...it,
              // new key field
              customerProductName: it.customerProductName,
              // backward-compat fields
              productCode:  it.inhouseProductCode || null,
              productName:  it.customerProductName,
              inhouseName:  it.inhouseProductName  || null,
              primaryPack:  it.unitPackType        || null,
              secondaryPack:it.packingType         || null,
            }))
          )
        }
      } catch (_) { /* non-critical */ }
    }
    setShowForm(false); setEditing(null)
    if (sfgResult) setSfgAlert(sfgResult)
    load()
  }

  async function handleDelete(order) {
    if (!confirm('Delete order ' + order.diNo + '?')) return
    await salesOrderApi.remove(order.id)
    setDispatchOrder(null); load()
  }

  async function handleStatusChange(itemId, status) {
    await salesOrderApi.updateItem(itemId, { status })
    load()
  }

  async function handleDispatchSave() {
    setDispatchOrder(null); load()
  }

  async function handleAddCompany(code, name) {
    await salesOrderApi.addCompany(code, name)
    const res = await salesOrderApi.companies()
    setCompanies(res.data)
  }

  // ── Derived ──────────────────────────────────────────────────────────────
  const summary = STATUSES.reduce((acc, s) => {
    acc[s] = orders.reduce((n, o) => n + o.items.filter(it => it.status === s).length, 0)
    return acc
  }, {})

  const totalOpen = orders.filter(o => o.items.some(it => it.status !== 'DISPATCHED')).length

  // Orders tab — active/open orders
  const ordersVisible = orders.filter(o => {
    const matchSearch = !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.diNo.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'ALL' || o.items.some(it => it.status === filterStatus)
    const matchCo = filterCompany === 'ALL' || o.company === filterCompany
    return matchSearch && matchStatus && matchCo
  })

  // Dispatch tab — all orders, optionally filtered by status
  const dispatchVisible = orders.filter(o => {
    if (dispatchFilter === 'ALL') return true
    return o.items.some(it => it.status === dispatchFilter)
  })

  // History tab — all orders with search
  const historyVisible = orders.filter(o =>
    !search || o.customerName.toLowerCase().includes(search.toLowerCase()) || o.diNo.toLowerCase().includes(search.toLowerCase())
  )

  const TABS = [
    { key: 'orders',   label: 'Sales Orders', count: totalOpen },
    { key: 'dispatch', label: 'Dispatch',      count: summary['READY_TO_DISPATCH'] || 0 },
    { key: 'history',  label: 'Order History', count: orders.length },
  ]

  const etdDays = (dateStr) => {
    if (!dateStr) return null
    return Math.ceil((new Date(dateStr) - new Date()) / 86400000)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Page header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">SOM Phytopharma — {orders.length} orders total</p>
        </div>
        {activeTab === 'orders' && !showForm && (
          <button onClick={() => { setEditing(null); setShowForm(true) }}
            className="text-white px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90"
            style={{ background: BRAND }}>
            + New Order
          </button>
        )}
      </div>

      {err && <div className="mb-4 text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{err}</div>}

      {/* SFG Availability Alert — shown after creating order when SFG stock exists */}
      {sfgAlert && (
        <div className="mb-4 rounded-xl border border-green-300 bg-green-50 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-green-800 mb-2">
                ✅ SFG Stock Available — Planner Action Required
              </p>
              <div className="space-y-1">
                {sfgAlert.map((s, i) => (
                  <div key={i} className="text-sm text-green-700 flex gap-3">
                    <span className="font-semibold">{s.productCode}</span>
                    <span>{s.productName}</span>
                    <span className="ml-auto text-green-900 font-semibold">
                      {s.sfgQty} {s.uom} in SFG
                      {s.orderedQty && (
                        <span className={s.sfgQty >= s.orderedQty ? ' text-green-600' : ' text-orange-600'}>
                          {' '}(ordered {s.orderedQty} {s.uom}
                          {s.sfgQty >= s.orderedQty ? ' — fully covered ✓' : ' — partial'})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-2">
                Inform the planner — these products can be packed directly from SFG stock.
              </p>
            </div>
            <button onClick={() => setSfgAlert(null)}
              className="text-green-500 hover:text-green-800 text-lg leading-none mt-0.5">×</button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-gray-200">
        {TABS.map(tab => (
          <button key={tab.key} onClick={() => { setActiveTab(tab.key); setShowForm(false) }}
            className={'px-5 py-3 text-sm font-semibold border-b-2 transition-colors ' + (
              activeTab === tab.key
                ? 'border-green-600 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}>
            {tab.label}
            {tab.count > 0 && (
              <span className={'ml-2 text-xs font-bold px-1.5 py-0.5 rounded-full ' + (
                activeTab === tab.key ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              )}>{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── SALES ORDERS TAB ──────────────────────────────────────────────── */}
      {activeTab === 'orders' && (
        <div>
          {/* New order form */}
          {showForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6 shadow-sm">
              <h2 className="text-base font-bold text-gray-800 mb-5">
                {editing ? 'Edit — ' + editing.soId : 'New Sales Order'}
              </h2>
              <OrderForm initial={editing || undefined} companies={companies} products={products} profiles={profiles}
                onSave={handleSave}
                onCancel={() => { setShowForm(false); setEditing(null) }}
                onAddCompany={handleAddCompany} />
            </div>
          )}

          {/* Status summary */}
          <div className="grid grid-cols-4 gap-3 mb-5 lg:grid-cols-7">
            {STATUSES.map(s => (
              <button key={s} onClick={() => setFilterStatus(prev => prev === s ? 'ALL' : s)}
                className={'text-center p-3 rounded-xl border transition ' + (
                  filterStatus === s
                    ? STATUS_STYLE[s] + ' border-current'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}>
                <div className="text-xl font-bold text-gray-900">{summary[s]}</div>
                <div className={'text-xs mt-0.5 ' + (filterStatus === s ? '' : 'text-gray-500')}>{STATUS_LABELS[s]}</div>
              </button>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-5">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer or DI…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="ALL">All Companies</option>
              {companies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>

          {loading ? <div className="text-center py-16 text-gray-400">Loading…</div>
          : ordersVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">📋</div>
              <p className="font-medium">No orders found</p>
              <p className="text-sm mt-1">Click "+ New Order" to add one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ordersVisible.map(order => {
                const days = etdDays(order.estimatedDispatchDate)
                const overdue = days !== null && days < 0
                return (
                  <div key={order.id}
                    className={'bg-white border rounded-xl overflow-hidden ' + (overdue ? 'border-red-300' : 'border-gray-200')}>
                    <div className="flex items-start justify-between px-5 py-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-bold text-gray-900">{order.diNo}</span>
                          <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + PRIORITY_STYLE[order.priority]}>
                            {order.priority.replace('_',' ')}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{order.company}</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">{order.orderType}</span>
                        </div>
                        <div className="text-sm font-semibold text-gray-700">{order.customerName}</div>
                        <div className="flex gap-4 mt-1 text-xs text-gray-400 flex-wrap">
                          <span>{order.items.length} product{order.items.length !== 1 ? 's' : ''}</span>
                          {days !== null && (
                            <span className={overdue ? 'text-red-500 font-semibold' : days <= 7 ? 'text-orange-500 font-semibold' : ''}>
                              ETD: {fmtDate(order.estimatedDispatchDate)}
                              {overdue ? ' (' + Math.abs(days) + 'd overdue)' : days === 0 ? ' (today)' : ' (' + days + 'd)'}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {order.items.map(it => (
                            <span key={it.id} className={'text-xs px-2 py-0.5 rounded-full font-medium ' + (STATUS_STYLE[it.status] || 'bg-gray-100 text-gray-600')}>
                              {it.inhouseProductName} — {STATUS_LABELS[it.status] || it.status}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4 shrink-0">
                        <button onClick={() => { setEditing(order); setShowForm(true) }}
                          className="text-xs border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
                          Edit
                        </button>
                        <button onClick={() => { setDispatchOrder(order); setActiveTab('dispatch') }}
                          className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold"
                          style={{ background: BRAND }}>
                          Dispatch
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── DISPATCH TAB ──────────────────────────────────────────────────── */}
      {activeTab === 'dispatch' && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm text-gray-500 flex-1">Click any order to open the dispatch form.</p>
            <select value={dispatchFilter} onChange={e => setDispatchFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="ALL">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </div>

          {loading ? <div className="text-center py-16 text-gray-400">Loading…</div>
          : dispatchVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🚚</div>
              <p className="font-medium">No orders</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 font-semibold border-b border-gray-100" style={{ background: '#f8fdf8' }}>
                    <th className="text-left px-4 py-3">DI No.</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Products</th>
                    <th className="text-right px-4 py-3">Total Qty</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">ETD</th>
                    <th className="text-center px-4 py-3">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {dispatchVisible.map(order => {
                    const days = etdDays(order.estimatedDispatchDate)
                    const overdue = days !== null && days < 0
                    const totalQty = order.items.reduce((n, it) => n + parseFloat(it.totalQty || 0), 0)
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-green-50 transition cursor-pointer"
                        onClick={() => setDispatchOrder(order)}>
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{order.diNo}</td>
                        <td className="px-4 py-3 text-gray-500">{fmtDate(order.orderReceivedDate)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{order.customerName}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {order.items.map(it => it.inhouseProductName).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">
                          {totalQty} {order.items[0]?.totalUom || 'KG'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (STATUS_STYLE[order.items[0]?.status] || 'bg-gray-100 text-gray-600')}>
                            {STATUS_LABELS[order.items[0]?.status] || order.items[0]?.status}
                          </span>
                        </td>
                        <td className={'px-4 py-3 text-xs ' + (overdue ? 'text-red-500 font-semibold' : days !== null && days <= 7 ? 'text-orange-500 font-semibold' : 'text-gray-500')}>
                          {fmtDate(order.estimatedDispatchDate)}
                          {days !== null && (overdue ? ' (' + Math.abs(days) + 'd overdue)' : days <= 7 ? ' (' + days + 'd)' : '')}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={e => { e.stopPropagation(); setDispatchOrder(order) }}
                            className="text-xs text-white px-3 py-1.5 rounded-lg font-semibold"
                            style={{ background: BRAND }}>
                            Open
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ORDER HISTORY TAB ─────────────────────────────────────────────── */}
      {activeTab === 'history' && (
        <div>
          <div className="flex flex-wrap gap-3 mb-5">
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search customer or DI…"
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:ring-2 focus:ring-green-500 focus:outline-none" />
            <select value={filterCompany} onChange={e => setFilterCompany(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
              <option value="ALL">All Companies</option>
              {companies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
            </select>
          </div>

          {loading ? <div className="text-center py-16 text-gray-400">Loading…</div>
          : historyVisible.length === 0 ? (
            <div className="text-center py-16 text-gray-400">No orders found.</div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-500 font-semibold border-b border-gray-100" style={{ background: '#f8fdf8' }}>
                    <th className="text-left px-4 py-3">DI No.</th>
                    <th className="text-left px-4 py-3">Date</th>
                    <th className="text-left px-4 py-3">Customer</th>
                    <th className="text-left px-4 py-3">Products</th>
                    <th className="text-left px-4 py-3">Type</th>
                    <th className="text-right px-4 py-3">Qty</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">ETD</th>
                    <th className="text-left px-4 py-3">Invoice</th>
                    <th className="text-center px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {historyVisible.map(order => {
                    const days = etdDays(order.estimatedDispatchDate)
                    const overdue = days !== null && days < 0
                    const totalQty = order.items.reduce((n, it) => n + parseFloat(it.totalQty || 0), 0)
                    return (
                      <tr key={order.id} className="border-b border-gray-50 hover:bg-green-50 transition">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-gray-700">{order.diNo}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{fmtDate(order.orderReceivedDate)}</td>
                        <td className="px-4 py-3 font-semibold text-gray-800">{order.customerName}</td>
                        <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                          {order.items.map(it => it.inhouseProductName).join(', ')}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{order.orderType}</td>
                        <td className="px-4 py-3 text-right font-semibold text-xs">{totalQty} {order.items[0]?.totalUom || 'KG'}</td>
                        <td className="px-4 py-3">
                          <span className={'text-xs font-semibold px-2 py-0.5 rounded-full ' + (STATUS_STYLE[order.items[0]?.status] || 'bg-gray-100 text-gray-600')}>
                            {STATUS_LABELS[order.items[0]?.status] || order.items[0]?.status}
                          </span>
                        </td>
                        <td className={'px-4 py-3 text-xs ' + (overdue ? 'text-red-500 font-semibold' : 'text-gray-500')}>
                          {fmtDate(order.estimatedDispatchDate)}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{order.invoiceNo || '—'}</td>
                        <td className="px-4 py-3 text-center">
                          <button onClick={() => setDispatchOrder(order)}
                            className="text-xs border border-gray-300 px-2 py-1 rounded-lg hover:bg-gray-50">
                            Edit
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Dispatch modal */}
      {dispatchOrder && (
        <DispatchModal
          order={dispatchOrder}
          onSave={handleDispatchSave}
          onDelete={handleDelete}
          onClose={() => setDispatchOrder(null)} />
      )}
    </div>
  )
}
