import { useState, useEffect, useMemo } from 'react'
import { packingMaterialApi } from '../../../../api/masters.js'
import Pagination from '../../../../components/erp/Pagination.jsx'
import BackButton from '../../../../components/erp/BackButton.jsx'

// ── Static option lists ────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'BOTTLES_TINS',      label: 'Bottles / Containers / Tins',   icon: '🧴', prefix: 'BTL' },
  { value: 'POUCHES_BAGS',      label: 'Pouches / Bags / Covers',        icon: '🛍️', prefix: 'PCH' },
  { value: 'CORRUGATED_BOXES',  label: 'Corrugated Boxes / Cartons',     icon: '📦', prefix: 'CBB' },
]

const CAT_META = Object.fromEntries(CATEGORIES.map(c => [c.value, c]))

const SUB_TYPES = {
  BOTTLES_TINS:     ['Bottle', 'Container', 'Tin', 'Barrel', 'Drum', 'Jar', 'Lid / Cap', 'Plug / Vent'],
  POUCHES_BAGS:     ['Pouch', 'Bag', 'Cover', 'Liner'],
  CORRUGATED_BOXES: ['Regular CBB', 'Shipper Box', 'Inner Box'],
}

const MATERIALS_BTL  = ['HDPE', 'HM-HDPE', 'PET', 'Aluminium', 'US Tin', 'CL Tin', 'BP Tin', 'Glass', 'PP']
const MATERIALS_PCH  = ['Laminated Film', 'Aluminium (TLSB)', 'LD (Low Density PE)', 'Bilaminated', 'Woven / Kraft']
const SHAPES         = ['Round', 'Triangle', 'Square', 'Oval']
const COLORS_BTL     = ['White', 'Blue', 'Natural', 'Amber', 'Green', 'Clear', 'Yellow', 'Black', 'Silver']
const COLORS_PCH     = ['Silver', 'Plain', 'White', 'Golden', 'Blue']
const COLORS_CBB     = ['Brown', 'White', 'Golden Yellow']
const CAPACITY_UNITS = ['ML', 'GMS', 'LT', 'KG']
const PLY_OPTIONS    = [3, 5, 7]
const LAMINATES      = ['ITC Laminated', 'ITC Top', 'ITC White Board', 'White Duplex', 'Bilaminated']

// ── Helpers ────────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  itemName: '', category: '', subType: '', material: '',
  capacity: '', capacityUnit: 'ML',
  length: '', width: '', height: '',
  ply: '', shape: '', color: '',
  laminate: '', contentsSpec: '', packCount: '', notes: '',
}

function catBadge(value) {
  const map = {
    BOTTLES_TINS:     'bg-blue-50 text-blue-700 border-blue-200',
    POUCHES_BAGS:     'bg-violet-50 text-violet-700 border-violet-200',
    CORRUGATED_BOXES: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  }
  return map[value] || 'bg-gray-100 text-gray-600 border-gray-200'
}

function catCardCls(value, selected) {
  if (!selected) return 'border-gray-200 bg-white hover:border-gray-300'
  const map = {
    BOTTLES_TINS:     'border-blue-500 bg-blue-50',
    POUCHES_BAGS:     'border-violet-500 bg-violet-50',
    CORRUGATED_BOXES: 'border-emerald-500 bg-emerald-50',
  }
  return map[value] || 'border-indigo-500 bg-indigo-50'
}

function tabActiveCls(value) {
  const map = {
    ALL:              'bg-gray-800 text-white',
    BOTTLES_TINS:     'bg-blue-600 text-white',
    POUCHES_BAGS:     'bg-violet-600 text-white',
    CORRUGATED_BOXES: 'bg-emerald-600 text-white',
  }
  return map[value] || 'bg-indigo-600 text-white'
}

function specSummary(item) {
  if (item.category === 'BOTTLES_TINS') {
    return [
      item.shape,
      item.material,
      item.capacity != null ? `${item.capacity} ${item.capacityUnit || ''}`.trim() : null,
    ].filter(Boolean).join(' · ')
  }
  if (item.category === 'POUCHES_BAGS') {
    const dim = item.width && item.height ? `${item.width}×${item.height}mm` : null
    const cap = item.capacity != null ? `${item.capacity}${item.capacityUnit || ''}` : null
    return [item.material, dim, cap].filter(Boolean).join(' · ')
  }
  if (item.category === 'CORRUGATED_BOXES') {
    const dim = item.length && item.width && item.height
      ? `${item.length}×${item.width}×${item.height}mm`
      : null
    return [`${item.ply || '?'} PLY`, dim, item.laminate || item.color].filter(Boolean).join(' · ')
  }
  return ''
}

const inp = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white'

function Lbl({ text, required }) {
  return (
    <label className="block text-xs font-semibold text-gray-600 mb-1">
      {text}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function Field({ label, required, children }) {
  return (
    <div>
      <Lbl text={label} required={required} />
      {children}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function PackingMaster() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [loadErr, setLoadErr]   = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const [search, setSearch]       = useState('')
  const [filterCat, setFilterCat] = useState('ALL')
  const [page, setPage]           = useState(1)
  const [limit, setLimit]         = useState(15)

  useEffect(() => { load() }, [])

  async function load() {
    try {
      setLoading(true)
      setLoadErr('')
      const r = await packingMaterialApi.list()
      setItems(r.data || [])
    } catch (e) {
      console.error(e)
      setLoadErr(e.message || 'Failed to load data from server')
    }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i =>
      (filterCat === 'ALL' || i.category === filterCat) &&
      (!q || i.itemName.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q))
    )
  }, [items, search, filterCat])

  useEffect(() => { setPage(1) }, [search, filterCat])

  const paginated = filtered.slice((page - 1) * limit, page * limit)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  function openAdd() { setEditing(null); setForm(EMPTY_FORM); setMsg(''); setShowForm(true) }

  function openEdit(item) {
    setEditing(item)
    setForm({
      itemName:     item.itemName      || '',
      category:     item.category      || '',
      subType:      item.subType       || '',
      material:     item.material      || '',
      capacity:     item.capacity      != null ? String(item.capacity)  : '',
      capacityUnit: item.capacityUnit  || 'ML',
      length:       item.length        != null ? String(item.length)    : '',
      width:        item.width         != null ? String(item.width)     : '',
      height:       item.height        != null ? String(item.height)    : '',
      ply:          item.ply           != null ? String(item.ply)       : '',
      shape:        item.shape         || '',
      color:        item.color         || '',
      laminate:     item.laminate      || '',
      contentsSpec: item.contentsSpec  || '',
      packCount:    item.packCount     != null ? String(item.packCount) : '',
      notes:        item.notes         || '',
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
      setShowForm(false)
      load()
    } catch (e) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  async function del(id, name) {
    if (!confirm(`Delete "${name}"?`)) return
    try { await packingMaterialApi.delete(id); load() }
    catch (e) { alert(e.message) }
  }

  const counts = useMemo(() => {
    const r = { ALL: items.length }
    CATEGORIES.forEach(c => { r[c.value] = items.filter(i => i.category === c.value).length })
    return r
  }, [items])

  const tabs = [{ value: 'ALL', label: 'All', icon: '' }, ...CATEGORIES]

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packing Material Master</h1>
          <p className="text-sm text-gray-500 mt-1">
            Bottles / Containers / Tins &nbsp;·&nbsp; Pouches / Bags &nbsp;·&nbsp; Corrugated Boxes — item codes generated automatically
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={openAdd} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm">
            + Create Packing Material
          </button>
          <BackButton />
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {tabs.map(t => (
            <button key={t.value} onClick={() => { setFilterCat(t.value); setPage(1) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterCat === t.value ? tabActiveCls(t.value) : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {t.icon && <span>{t.icon}</span>}
              <span>{t.label}</span>
              <span className="opacity-70 font-normal ml-0.5">({counts[t.value] ?? 0})</span>
            </button>
          ))}
        </div>
        <input value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by item name or code…"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Table */}
      {loadErr && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm flex items-start gap-3">
          <span className="text-lg leading-none">⚠️</span>
          <div>
            <p className="font-semibold">Could not load packing materials</p>
            <p className="mt-0.5 font-mono text-xs">{loadErr}</p>
            <p className="mt-1 text-xs text-red-500">Make sure the backend is running and the Prisma client is regenerated (<code>npx prisma generate</code>).</p>
          </div>
          <button onClick={load} className="ml-auto text-red-600 underline text-xs whitespace-nowrap">Retry</button>
        </div>
      )}
      {loading ? (
        <p className="text-gray-400 py-12 text-center">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold w-24">Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Item Name</th>
                  <th className="text-left px-4 py-3 font-semibold w-36">Category</th>
                  <th className="text-left px-4 py-3 font-semibold w-24">Sub-type</th>
                  <th className="text-left px-4 py-3 font-semibold">Key Specs</th>
                  <th className="text-left px-4 py-3 font-semibold w-20">Color</th>
                  <th className="px-4 py-3 font-semibold w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-14 text-gray-400">
                      {search || filterCat !== 'ALL'
                        ? 'No items match your filters.'
                        : 'No packing materials yet — click "+ Create Packing Material" to add one.'}
                    </td>
                  </tr>
                ) : paginated.map(item => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700 whitespace-nowrap">{item.itemCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 border text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${catBadge(item.category)}`}>
                        {CAT_META[item.category]?.icon}
                        {CAT_META[item.category]?.label.split(' / ')[0]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.subType || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{specSummary(item) || '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.color || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openEdit(item)} className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 text-xs font-medium">Edit</button>
                        <button onClick={() => del(item.id, item.itemName)} className="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs font-medium">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-2">
            <Pagination page={page} total={filtered.length} limit={limit} onChange={setPage}
              onLimitChange={l => { setLimit(l); setPage(1) }} />
          </div>
        </div>
      )}

      {/* ── Modal ──────────────────────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {editing ? 'Edit Packing Material' : 'Create Packing Material'}
                </h2>
                {editing && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    Code: <span className="font-mono font-semibold text-indigo-600">{editing.itemCode}</span>
                  </p>
                )}
              </div>
              <button onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">
                ×
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {msg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">{msg}</div>
              )}

              {/* ── Category selector ─────────────────────────── */}
              <div>
                <Lbl text="Category" required />
                <div className="grid grid-cols-3 gap-3">
                  {CATEGORIES.map(cat => (
                    <button key={cat.value} type="button"
                      onClick={() => setForm({ ...EMPTY_FORM, category: cat.value })}
                      className={`p-3 border-2 rounded-xl text-center transition-all ${catCardCls(cat.value, form.category === cat.value)}`}>
                      <div className="text-2xl mb-1">{cat.icon}</div>
                      <div className="text-[11px] font-semibold text-gray-700 leading-snug">{cat.label}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{cat.prefix}-001…</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Conditional fields ────────────────────────── */}
              {form.category && (
                <>
                  {/* Item Name — all categories */}
                  <Field label="Item Name" required>
                    <input value={form.itemName} onChange={e => set('itemName', e.target.value)}
                      placeholder={
                        form.category === 'BOTTLES_TINS'    ? 'e.g. HDPE CONTAINERS TRIANGLE - 1 LT' :
                        form.category === 'POUCHES_BAGS'    ? 'e.g. Plain Laminated Film Silver 90x60mm' :
                        "e.g. CBB's 5 PLY 460×190×260mm OD"
                      }
                      className={inp} />
                  </Field>

                  {/* ── BOTTLES / CONTAINERS / TINS ─────────── */}
                  {form.category === 'BOTTLES_TINS' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Sub-type" required>
                          <select value={form.subType} onChange={e => set('subType', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {SUB_TYPES.BOTTLES_TINS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Material">
                          <select value={form.material} onChange={e => set('material', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {MATERIALS_BTL.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </Field>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                          <Lbl text="Capacity" />
                          <div className="flex gap-2">
                            <input type="number" min="0" step="any" value={form.capacity}
                              onChange={e => set('capacity', e.target.value)} placeholder="e.g. 500" className={inp} />
                            <select value={form.capacityUnit} onChange={e => set('capacityUnit', e.target.value)}
                              className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-24">
                              {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                            </select>
                          </div>
                        </div>
                        <Field label="Shape">
                          <select value={form.shape} onChange={e => set('shape', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </Field>
                      </div>

                      <div>
                        <Lbl text="Color" />
                        <div className="flex flex-wrap gap-2">
                          {COLORS_BTL.map(c => (
                            <button key={c} type="button"
                              onClick={() => set('color', form.color === c ? '' : c)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                                form.color === c
                                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}>
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Lbl text="Outer Dimensions — L × W × H (mm)" />
                        <div className="grid grid-cols-3 gap-3">
                          {[['length','Length'],['width','Width'],['height','Height']].map(([k,p]) => (
                            <input key={k} type="number" min="0" step="any" value={form[k]}
                              onChange={e => set(k, e.target.value)} placeholder={p} className={inp} />
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* ── POUCHES / BAGS / COVERS ─────────────── */}
                  {form.category === 'POUCHES_BAGS' && (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Sub-type" required>
                          <select value={form.subType} onChange={e => set('subType', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {SUB_TYPES.POUCHES_BAGS.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </Field>
                        <Field label="Material">
                          <select value={form.material} onChange={e => set('material', e.target.value)} className={inp}>
                            <option value="">Select…</option>
                            {MATERIALS_PCH.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                        </Field>
                      </div>

                      <div>
                        <Lbl text="Dimensions — Width × Height (mm)" />
                        <div className="grid grid-cols-2 gap-3">
                          <input type="number" min="0" step="any" value={form.width}
                            onChange={e => set('width', e.target.value)} placeholder="Width (mm)" className={inp} />
                          <input type="number" min="0" step="any" value={form.height}
                            onChange={e => set('height', e.target.value)} placeholder="Height (mm)" className={inp} />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Lbl text="Size / Capacity" />
                          <div className="flex gap-2">
                            <input type="number" min="0" step="any" value={form.capacity}
                              onChange={e => set('capacity', e.target.value)} placeholder="e.g. 100" className={inp} />
                            <select value={form.capacityUnit} onChange={e => set('capacityUnit', e.target.value)}
                              className="border border-gray-300 rounded-lg px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white w-24">
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

                  {/* ── CORRUGATED BOXES / CARTONS ──────────── */}
                  {form.category === 'CORRUGATED_BOXES' && (
                    <>
                      <div>
                        <Lbl text="Ply" required />
                        <div className="flex gap-3">
                          {PLY_OPTIONS.map(p => (
                            <button key={p} type="button"
                              onClick={() => set('ply', form.ply === String(p) ? '' : String(p))}
                              className={`flex-1 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${
                                form.ply === String(p)
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
                              }`}>
                              {p} PLY
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <Lbl text="Outer Dimensions — L × W × H (mm OD)" required />
                        <div className="grid grid-cols-3 gap-3">
                          {[['length','Length'],['width','Width'],['height','Height']].map(([k,p]) => (
                            <input key={k} type="number" min="0" step="any" value={form[k]}
                              onChange={e => set(k, e.target.value)} placeholder={p} className={inp} />
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
                          <input value={form.contentsSpec} onChange={e => set('contentsSpec', e.target.value)}
                            placeholder="e.g. 20 x 500ml Round Bottles" className={inp} />
                        </Field>
                        <Field label="Pack Count">
                          <input type="number" min="0" step="1" value={form.packCount}
                            onChange={e => set('packCount', e.target.value)} placeholder="e.g. 20" className={inp} />
                        </Field>
                      </div>
                    </>
                  )}

                  {/* Notes — all categories */}
                  <Field label="Notes / Remarks">
                    <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
                      rows={2} placeholder="Any additional details…"
                      className={`${inp} resize-none`} />
                  </Field>
                </>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={save} disabled={saving || !form.category}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
