import { useState, useEffect, useMemo } from 'react'
import { packingMaterialApi } from '../../../../api/masters.js'
import BackButton from '../../../../components/erp/BackButton.jsx'

// ── Category definitions ───────────────────────────────────────────────────────
const CATEGORIES = [
  {
    value: 'BOTTLES_TINS',
    label: 'Bottles / Containers / Tins',
    icon: '🧴',
    desc: 'HDPE bottles, CL tins, barrels, containers, jars',
    prefix: 'BTL',
    cls: { grad: 'from-blue-500 to-blue-700', header: 'bg-blue-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600', badge: 'bg-blue-100 text-blue-700', ring: 'ring-blue-500' },
  },
  {
    value: 'POUCHES_BAGS',
    label: 'Pouches / Bags / Covers',
    icon: '🛍️',
    desc: 'Laminated pouches, LD covers, liners, handle bags',
    prefix: 'PCH',
    cls: { grad: 'from-violet-500 to-violet-700', header: 'bg-violet-600', light: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-600', badge: 'bg-violet-100 text-violet-700', ring: 'ring-violet-500' },
  },
  {
    value: 'CORRUGATED_BOXES',
    label: 'Corrugated Boxes / Cartons',
    icon: '📦',
    desc: '3, 5 & 7 ply boxes, shippers, inner cartons',
    prefix: 'CBB',
    cls: { grad: 'from-emerald-500 to-emerald-700', header: 'bg-emerald-600', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', ring: 'ring-emerald-500' },
  },
]
const CAT = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

// ── Sub-type definitions ───────────────────────────────────────────────────────
const SUB_TYPES = {
  BOTTLES_TINS: [
    { value: 'Bottle',      icon: '🍾' },
    { value: 'Container',   icon: '🧴' },
    { value: 'Tin',         icon: '🥫' },
    { value: 'Barrel',      icon: '🛢️' },
    { value: 'Drum',        icon: '🏺' },
    { value: 'Jar',         icon: '🫙' },
    { value: 'Lid / Cap',   icon: '⚙️' },
    { value: 'Plug / Vent', icon: '🔌' },
  ],
  POUCHES_BAGS: [
    { value: 'Pouch',  icon: '👝' },
    { value: 'Bag',    icon: '🛍️' },
    { value: 'Cover',  icon: '🫙' },
    { value: 'Liner',  icon: '📄' },
  ],
  CORRUGATED_BOXES: [
    { value: 'Regular CBB',  icon: '📦' },
    { value: 'Shipper Box',  icon: '📫' },
    { value: 'Inner Box',    icon: '📭' },
  ],
}

// ── Spec chips ─────────────────────────────────────────────────────────────────
const CHIP_CLS = {
  blue:    'bg-blue-50 text-blue-700 border-blue-200',
  violet:  'bg-violet-50 text-violet-700 border-violet-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber:   'bg-amber-50 text-amber-700 border-amber-200',
  yellow:  'bg-yellow-50 text-yellow-700 border-yellow-200',
  orange:  'bg-orange-50 text-orange-700 border-orange-200',
  sky:     'bg-sky-50 text-sky-700 border-sky-200',
  pink:    'bg-pink-50 text-pink-700 border-pink-200',
  gray:    'bg-gray-100 text-gray-600 border-gray-200',
  slate:   'bg-slate-50 text-slate-500 border-slate-200',
}

function getChips(item) {
  const c = []
  if (item.category === 'CORRUGATED_BOXES') {
    if (item.ply)  c.push({ label: `${item.ply} PLY`, color: 'emerald' })
    if (item.length && item.width && item.height) c.push({ label: `${item.length}×${item.width}×${item.height}mm`, color: 'amber' })
    if (item.color)       c.push({ label: item.color, color: 'yellow' })
    if (item.laminate)    c.push({ label: item.laminate, color: 'violet' })
    if (item.contentsSpec) c.push({ label: item.contentsSpec, color: 'sky' })
    if (item.packCount)   c.push({ label: `${item.packCount} Nos`, color: 'orange' })
  } else if (item.category === 'POUCHES_BAGS') {
    if (item.width && item.height) c.push({ label: `${item.width}×${item.height}mm`, color: 'amber' })
    if (item.capacity != null) c.push({ label: `${item.capacity} ${item.capacityUnit || ''}`.trim(), color: 'blue' })
    if (item.material) c.push({ label: item.material, color: 'gray' })
    if (item.color)    c.push({ label: item.color, color: 'pink' })
  } else {
    if (item.capacity != null) c.push({ label: `${item.capacity} ${item.capacityUnit || ''}`.trim(), color: 'blue' })
    if (item.shape)    c.push({ label: item.shape, color: 'violet' })
    if (item.material) c.push({ label: item.material, color: 'gray' })
    if (item.color)    c.push({ label: item.color, color: 'pink' })
  }
  if (item.notes) c.push({ label: item.notes, color: 'slate', italic: true })
  return c
}

function Chip({ label, color = 'gray', italic }) {
  return (
    <span className={`inline-flex items-center border text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${CHIP_CLS[color] || CHIP_CLS.gray} ${italic ? 'italic' : ''}`}>
      {label}
    </span>
  )
}

// ── Form constants ─────────────────────────────────────────────────────────────
const MATERIALS_BTL  = ['HDPE', 'HM-HDPE', 'PET', 'Aluminium', 'US Tin', 'CL Tin', 'BP Tin', 'Glass', 'PP']
const MATERIALS_PCH  = ['Laminated Film', 'Aluminium (TLSB)', 'LD (Low Density PE)', 'Bilaminated', 'Woven / Kraft']
const SHAPES         = ['Round', 'Triangle', 'Square', 'Oval']
const COLORS_BTL     = ['White', 'Blue', 'Natural', 'Amber', 'Green', 'Clear', 'Yellow', 'Black', 'Silver']
const COLORS_PCH     = ['Silver', 'Plain', 'White', 'Golden', 'Blue']
const COLORS_CBB     = ['Brown', 'White', 'Golden Yellow']
const CAPACITY_UNITS = ['ML', 'GMS', 'LT', 'KG']
const PLY_OPTIONS    = [3, 5, 7]
const LAMINATES      = ['ITC Laminated', 'ITC Top', 'ITC White Board', 'White Duplex', 'Bilaminated']
const EMPTY_FORM     = {
  itemName: '', category: '', subType: '', material: '',
  capacity: '', capacityUnit: 'ML', length: '', width: '', height: '',
  ply: '', shape: '', color: '', laminate: '', contentsSpec: '', packCount: '', notes: '',
}
const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white'
function Lbl({ text, req }) { return <label className="block text-xs font-semibold text-gray-600 mb-1">{text}{req && <span className="text-red-500 ml-0.5">*</span>}</label> }
function Field({ label, req, children }) { return <div><Lbl text={label} req={req} />{children}</div> }

// ── Main component ─────────────────────────────────────────────────────────────
export default function PackingMaster() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(true)
  const [loadErr, setLoadErr] = useState('')

  // 3-level navigation
  const [view, setView]         = useState('categories') // 'categories' | 'subtypes' | 'items'
  const [selCat, setSelCat]     = useState(null)
  const [selSub, setSelSub]     = useState(null)

  // Form
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    try { setLoading(true); setLoadErr(''); const r = await packingMaterialApi.list(); setItems(r.data || []) }
    catch (e) { setLoadErr(e.message || 'Failed to load') }
    finally { setLoading(false) }
  }

  // Navigation
  function goCategories() { setView('categories'); setSelCat(null); setSelSub(null) }
  function goSubTypes(cat) { setSelCat(cat); setSelSub(null); setView('subtypes') }
  function goItems(sub)    { setSelSub(sub); setView('items') }
  function goBack()        { view === 'items' ? (setView('subtypes'), setSelSub(null)) : goCategories() }

  // Derived counts
  const catCounts = useMemo(() => {
    const c = {}; items.forEach(i => { c[i.category] = (c[i.category] || 0) + 1 }); return c
  }, [items])

  const subCounts = useMemo(() => {
    const c = {}; items.filter(i => i.category === selCat).forEach(i => { const s = i.subType || 'Other'; c[s] = (c[s] || 0) + 1 }); return c
  }, [items, selCat])

  const subItems = useMemo(() =>
    items.filter(i => i.category === selCat && i.subType === selSub),
    [items, selCat, selSub]
  )

  const groupedByName = useMemo(() => {
    const g = {}; subItems.forEach(i => { if (!g[i.itemName]) g[i.itemName] = []; g[i.itemName].push(i) }); return g
  }, [subItems])

  // Form helpers
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openAdd() {
    setEditing(null)
    setForm({ ...EMPTY_FORM, category: selCat || '', subType: selSub || '' })
    setMsg(''); setShowForm(true)
  }
  function openEdit(item) {
    setEditing(item)
    setForm({
      itemName: item.itemName || '', category: item.category || '', subType: item.subType || '',
      material: item.material || '',
      capacity: item.capacity != null ? String(item.capacity) : '', capacityUnit: item.capacityUnit || 'ML',
      length: item.length != null ? String(item.length) : '',
      width: item.width != null ? String(item.width) : '',
      height: item.height != null ? String(item.height) : '',
      ply: item.ply != null ? String(item.ply) : '',
      shape: item.shape || '', color: item.color || '', laminate: item.laminate || '',
      contentsSpec: item.contentsSpec || '',
      packCount: item.packCount != null ? String(item.packCount) : '',
      notes: item.notes || '',
    })
    setMsg(''); setShowForm(true)
  }
  async function save() {
    if (!form.itemName || !form.category) { setMsg('Item Name and Category are required'); return }
    if (form.category === 'CORRUGATED_BOXES' && !form.ply) { setMsg('Ply is required for Corrugated Boxes'); return }
    setSaving(true); setMsg('')
    try {
      if (editing) await packingMaterialApi.update(editing.id, form)
      else         await packingMaterialApi.create(form)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) }
    finally { setSaving(false) }
  }
  async function del(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    try { await packingMaterialApi.delete(id); load() } catch (e) { alert(e.message) }
  }

  const catMeta = selCat ? CAT[selCat] : null

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Error banner ─────────────────────────────────────── */}
      {loadErr && (
        <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm flex items-center gap-3">
          <span>⚠️ {loadErr}</span>
          <button onClick={load} className="ml-auto underline text-xs shrink-0">Retry</button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          VIEW 1 — Category selection
          ════════════════════════════════════════════════════════ */}
      {view === 'categories' && (
        <div className="px-6 py-5">
          <div className="flex items-start justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Packing Material Master</h1>
              <p className="text-sm text-gray-500 mt-1">Select a category to browse and manage packing materials</p>
            </div>
            <BackButton />
          </div>

          {loading ? (
            <p className="text-center text-gray-400 py-20">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => goSubTypes(cat.value)}
                  className="group relative bg-white border-2 border-gray-200 rounded-2xl p-6 text-left hover:border-gray-300 hover:shadow-xl hover:-translate-y-0.5 transition-all duration-200 cursor-pointer overflow-hidden"
                >
                  {/* top colour bar */}
                  <div className={`absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r ${cat.cls.grad}`} />

                  <div className="text-4xl mb-4 mt-1">{cat.icon}</div>
                  <h2 className="text-lg font-bold text-gray-900 leading-snug mb-1">{cat.label}</h2>
                  <p className="text-xs text-gray-500 mb-5 leading-relaxed">{cat.desc}</p>

                  <div className="flex items-center justify-between mb-4">
                    <span className={`text-lg font-extrabold ${cat.cls.text}`}>
                      {catCounts[cat.value] || 0}
                      <span className="text-sm font-medium text-gray-400 ml-1">materials</span>
                    </span>
                    <span className="text-gray-300 group-hover:text-gray-500 transition-colors text-xl font-light">→</span>
                  </div>

                  {/* sub-type pills preview */}
                  <div className="flex flex-wrap gap-1.5">
                    {(SUB_TYPES[cat.value] || []).map((s, i) => (
                      <span key={s.value} className={`text-[10px] px-2 py-0.5 rounded-full font-medium border-0 ${cat.cls.badge}`}>
                        {s.icon} {s.value}
                      </span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          VIEW 2 — Sub-type selection
          ════════════════════════════════════════════════════════ */}
      {view === 'subtypes' && catMeta && (
        <div className="px-6 py-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
            <button onClick={goCategories} className="hover:text-gray-600 font-medium">Packing Materials</button>
            <span>›</span>
            <span className={`font-semibold ${catMeta.cls.text}`}>{catMeta.label}</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between mb-7">
            <div>
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <span>{catMeta.icon}</span>{catMeta.label}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                {catCounts[catMeta.value] || 0} materials · choose a type to view items
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium">
                ← Back
              </button>
              <button onClick={openAdd} className={`${catMeta.cls.header} text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 shadow-sm`}>
                + Add Item
              </button>
            </div>
          </div>

          {/* Sub-type grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {(SUB_TYPES[catMeta.value] || []).map(sub => {
              const count = subCounts[sub.value] || 0
              const active = count > 0
              return (
                <button
                  key={sub.value}
                  onClick={() => active && goItems(sub.value)}
                  disabled={!active}
                  className={`relative bg-white border-2 rounded-2xl p-5 text-center transition-all duration-150 ${
                    active
                      ? `border-gray-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:${catMeta.cls.border}`
                      : 'border-gray-100 opacity-35 cursor-not-allowed'
                  }`}
                >
                  {active && <div className={`absolute top-3 right-3 w-2 h-2 rounded-full ${catMeta.cls.header}`} />}
                  <div className="text-3xl mb-2.5">{sub.icon}</div>
                  <div className="text-sm font-bold text-gray-800">{sub.value}</div>
                  <div className={`text-xs font-semibold mt-1.5 ${active ? catMeta.cls.text : 'text-gray-300'}`}>
                    {count} item{count !== 1 ? 's' : ''}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          VIEW 3 — Items (grouped by product name)
          ════════════════════════════════════════════════════════ */}
      {view === 'items' && catMeta && selSub && (
        <div className="px-6 py-5">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-xs text-gray-400 mb-5">
            <button onClick={goCategories} className="hover:text-gray-600 font-medium">Packing Materials</button>
            <span>›</span>
            <button onClick={() => { setView('subtypes'); setSelSub(null) }} className={`hover:text-gray-600 font-medium ${catMeta.cls.text}`}>{catMeta.label}</button>
            <span>›</span>
            <span className="font-semibold text-gray-700">{selSub}</span>
          </nav>

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                {(SUB_TYPES[catMeta.value] || []).find(s => s.value === selSub)?.icon} {selSub}
              </h1>
              <p className="text-xs text-gray-400 mt-0.5">
                <span className={catMeta.cls.text}>{catMeta.label}</span>
                {' · '}{subItems.length} item{subItems.length !== 1 ? 's' : ''}
                {Object.keys(groupedByName).length !== subItems.length && (
                  <> · {Object.keys(groupedByName).length} product{Object.keys(groupedByName).length !== 1 ? 's' : ''}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goBack} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 text-sm font-medium">
                ← Back
              </button>
              <button onClick={openAdd} className={`${catMeta.cls.header} text-white px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 shadow-sm`}>
                + Add Item
              </button>
            </div>
          </div>

          {subItems.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-3">
                {(SUB_TYPES[catMeta.value] || []).find(s => s.value === selSub)?.icon || '📦'}
              </div>
              <p className="font-semibold text-gray-500">No items yet</p>
              <button onClick={openAdd} className={`mt-3 ${catMeta.cls.text} underline text-sm`}>Add the first item</button>
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByName).map(([name, variants]) => (
                <div key={name} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">

                  {/* Product group header */}
                  <div className={`flex items-center justify-between px-5 py-3.5 ${catMeta.cls.light} border-b ${catMeta.cls.border}`}>
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-gray-900">{name}</span>
                      {variants.length > 1 && (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${catMeta.cls.badge}`}>
                          {variants.length} variants
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 font-medium">{catMeta.prefix}</span>
                  </div>

                  {/* Variant rows */}
                  <div className="divide-y divide-gray-50">
                    {variants.map(item => (
                      <div key={item.id} className="flex items-center gap-4 px-5 py-3.5 group hover:bg-gray-50 transition-colors">

                        {/* Item code */}
                        <span className={`font-mono text-[11px] font-bold ${catMeta.cls.text} w-16 shrink-0`}>
                          {item.itemCode}
                        </span>

                        {/* Spec chips */}
                        <div className="flex flex-wrap gap-1.5 flex-1 min-w-0">
                          {getChips(item).length > 0
                            ? getChips(item).map((chip, i) => <Chip key={i} label={chip.label} color={chip.color} italic={chip.italic} />)
                            : <span className="text-xs text-gray-300 italic">No specifications recorded</span>
                          }
                        </div>

                        {/* UOM */}
                        <span className="text-xs text-gray-400 shrink-0 font-medium">{item.uom || 'Nos'}</span>

                        {/* Actions — appear on row hover */}
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEdit(item)}
                            className="text-blue-600 hover:text-blue-800 px-2.5 py-1 rounded-lg hover:bg-blue-50 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => del(item.id, item.itemName)}
                            className="text-red-400 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50 text-sm font-bold leading-none"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          Modal — Create / Edit
          ════════════════════════════════════════════════════════ */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? 'Edit Packing Material' : 'New Packing Material'}
                </h2>
                {editing && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Code: <span className={`font-mono font-bold ${(catMeta || CAT[form.category])?.cls.text}`}>{editing.itemCode}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setShowForm(false)} className="text-gray-300 hover:text-gray-600 text-2xl w-8 h-8 flex items-center justify-center">×</button>
            </div>

            <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
              {msg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">{msg}</div>
              )}

              {/* Step 1 — Category */}
              <div>
                <Lbl text="Category" req />
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} type="button"
                      onClick={() => setForm({ ...EMPTY_FORM, category: cat.value })}
                      className={`p-3.5 border-2 rounded-xl text-center transition-all ${
                        form.category === cat.value
                          ? `${cat.cls.border} ${cat.cls.light} ring-2 ${cat.cls.ring}`
                          : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                      }`}>
                      <div className="text-2xl mb-1.5">{cat.icon}</div>
                      <div className="text-[11px] font-bold text-gray-700 leading-snug">{cat.label}</div>
                      <div className={`text-[10px] font-mono mt-1 ${cat.cls.text}`}>{cat.prefix}-001…</div>
                    </button>
                  ))}
                </div>
              </div>

              {form.category && (
                <>
                  {/* Step 2 — Sub-type */}
                  <div>
                    <Lbl text="Type" req />
                    <div className="flex flex-wrap gap-2">
                      {(SUB_TYPES[form.category] || []).map(s => (
                        <button key={s.value} type="button"
                          onClick={() => set('subType', form.subType === s.value ? '' : s.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                            form.subType === s.value
                              ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                              : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                          }`}>
                          <span>{s.icon}</span>{s.value}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Step 3 — Base name */}
                  <Field label="Product Name (short — specs in fields below)" req>
                    <input value={form.itemName} onChange={e => set('itemName', e.target.value)}
                      placeholder={
                        form.category === 'CORRUGATED_BOXES' ? 'e.g. 5 PLY CBB' :
                        form.category === 'POUCHES_BAGS'     ? 'e.g. Silver Laminated Pouch' :
                                                               'e.g. HDPE Triangle Container'
                      }
                      className={inp} />
                  </Field>

                  {/* ── BOTTLES / CONTAINERS / TINS fields ─── */}
                  {form.category === 'BOTTLES_TINS' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Material">
                          <select value={form.material} onChange={e => set('material', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {MATERIALS_BTL.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </Field>
                        <Field label="Shape">
                          <select value={form.shape} onChange={e => set('shape', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </Field>
                      </div>
                      <div>
                        <Lbl text="Capacity" />
                        <div className="flex gap-2">
                          <input type="number" min="0" step="any" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 500" className={inp} />
                          <select value={form.capacityUnit} onChange={e => set('capacityUnit', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-24">
                            {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        </div>
                      </div>
                      <div>
                        <Lbl text="Color" />
                        <div className="flex flex-wrap gap-2">
                          {COLORS_BTL.map(c => (
                            <button key={c} type="button" onClick={() => set('color', form.color === c ? '' : c)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${form.color === c ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Lbl text="Outer Dimensions — L × W × H (mm)" />
                        <div className="grid grid-cols-3 gap-3">
                          {[['length','Length'],['width','Width'],['height','Height']].map(([k,p]) => (
                            <input key={k} type="number" min="0" step="any" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} className={inp} />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── POUCHES / BAGS / COVERS fields ───────── */}
                  {form.category === 'POUCHES_BAGS' && (
                    <>
                      <Field label="Material">
                        <select value={form.material} onChange={e => set('material', e.target.value)} className={inp}>
                          <option value="">Select…</option>
                          {MATERIALS_PCH.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </Field>
                      <div>
                        <Lbl text="Dimensions — Width × Height (mm)" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" min="0" step="any" value={form.width} onChange={e => set('width', e.target.value)} placeholder="Width" className={inp} />
                          <input type="number" min="0" step="any" value={form.height} onChange={e => set('height', e.target.value)} placeholder="Height" className={inp} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Lbl text="Size / Capacity" />
                          <div className="flex gap-2">
                            <input type="number" min="0" step="any" value={form.capacity} onChange={e => set('capacity', e.target.value)} placeholder="e.g. 1" className={inp} />
                            <select value={form.capacityUnit} onChange={e => set('capacityUnit', e.target.value)} className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-24">
                              {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                        <Field label="Color">
                          <select value={form.color} onChange={e => set('color', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {COLORS_PCH.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                      </div>
                    </>
                  )}

                  {/* ── CORRUGATED BOXES fields ───────────────── */}
                  {form.category === 'CORRUGATED_BOXES' && (
                    <>
                      <div>
                        <Lbl text="Ply" req />
                        <div className="flex gap-3">
                          {PLY_OPTIONS.map(p => (
                            <button key={p} type="button"
                              onClick={() => set('ply', form.ply === String(p) ? '' : String(p))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.ply === String(p) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              {p} PLY
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <Lbl text="Outer Dimensions — L × W × H (mm OD)" req />
                        <div className="grid grid-cols-3 gap-3">
                          {[['length','Length'],['width','Width'],['height','Height']].map(([k,p]) => (
                            <input key={k} type="number" min="0" step="any" value={form[k]} onChange={e => set(k, e.target.value)} placeholder={p} className={inp} />
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Color / Board">
                          <select value={form.color} onChange={e => set('color', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {COLORS_CBB.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </Field>
                        <Field label="Laminate">
                          <select value={form.laminate} onChange={e => set('laminate', e.target.value)} className={inp}>
                            <option value="">None</option>
                            {LAMINATES.map(l => <option key={l} value={l}>{l}</option>)}
                          </select>
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Contents Spec">
                          <input value={form.contentsSpec} onChange={e => set('contentsSpec', e.target.value)} placeholder="e.g. 20 × 500ml Round Bottles" className={inp} />
                        </Field>
                        <Field label="Pack Count">
                          <input type="number" min="0" step="1" value={form.packCount} onChange={e => set('packCount', e.target.value)} placeholder="e.g. 20" className={inp} />
                        </Field>
                      </div>
                    </>
                  )}

                  <Field label="Notes / Remarks">
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                      placeholder="Any additional details…" className={`${inp} resize-none`} />
                  </Field>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={save} disabled={saving || !form.category}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-xl hover:bg-indigo-700 font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-200 py-2.5 rounded-xl hover:bg-gray-50 text-gray-700 text-sm font-medium">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
