import { useState, useEffect, useMemo } from 'react'
import { packingMaterialApi } from '../../../../api/masters.js'
import Pagination from '../../../../components/erp/Pagination.jsx'
import BackButton from '../../../../components/erp/BackButton.jsx'

const PACKING_TYPES  = ['Bottle', 'Jar', 'Box', 'Tin', 'Drum', 'Pouch']
const MATERIALS      = ['HDPE', 'PET', 'Aluminium', 'Tin', 'Glass', 'Kraft']
const CAPACITY_UNITS = ['ML', 'LT', 'KG', 'GM']
const SHAPES         = ['Round', 'Square', 'Triangle', 'Oval']
const COLORS         = ['White', 'Blue', 'Silver', 'Amber', 'Green', 'Clear', 'Black']
const UOMS           = ['Nos', 'KG', 'MT']

const NEEDS_DIMS  = ['Box', 'Pouch']
const NEEDS_PLY   = ['Box']

const EMPTY_FORM = {
  itemCode: '', itemName: '', packingType: '', material: '',
  capacity: '', capacityUnit: 'ML',
  length: '', width: '', height: '', ply: '',
  shape: '', color: '', uom: 'Nos',
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

const cls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500'

export default function PackingMaster() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')

  const [search, setSearch]           = useState('')
  const [filterType, setFilterType]   = useState('ALL')
  const [page, setPage]               = useState(1)
  const [limit, setLimit]             = useState(15)

  useEffect(() => { load() }, [])

  const load = async () => {
    try {
      setLoading(true)
      const r = await packingMaterialApi.list()
      setItems(r.data || [])
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return items.filter(i =>
      (filterType === 'ALL' || i.packingType === filterType) &&
      (!q || i.itemName.toLowerCase().includes(q) || i.itemCode.toLowerCase().includes(q))
    )
  }, [items, search, filterType])

  useEffect(() => { setPage(1) }, [search, filterType])

  const paginated = filtered.slice((page - 1) * limit, page * limit)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const openAdd = () => {
    setEditing(null); setForm(EMPTY_FORM); setMsg(''); setShowForm(true)
  }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      itemCode:     item.itemCode      || '',
      itemName:     item.itemName      || '',
      packingType:  item.packingType   || '',
      material:     item.material      || '',
      capacity:     item.capacity      != null ? String(item.capacity) : '',
      capacityUnit: item.capacityUnit  || 'ML',
      length:       item.length        != null ? String(item.length)   : '',
      width:        item.width         != null ? String(item.width)    : '',
      height:       item.height        != null ? String(item.height)   : '',
      ply:          item.ply           != null ? String(item.ply)      : '',
      shape:        item.shape         || '',
      color:        item.color         || '',
      uom:          item.uom           || 'Nos',
    })
    setMsg(''); setShowForm(true)
  }

  const save = async () => {
    if (!form.itemCode || !form.itemName || !form.packingType) {
      setMsg('Item Code, Item Name, and Packing Type are required')
      return
    }
    setSaving(true); setMsg('')
    try {
      if (editing) await packingMaterialApi.update(editing.id, form)
      else         await packingMaterialApi.create(form)
      setShowForm(false)
      load()
    } catch (e) { setMsg(e.message) }
    finally { setSaving(false) }
  }

  const del = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try { await packingMaterialApi.delete(id); load() }
    catch (e) { alert(e.message) }
  }

  const showDims = NEEDS_DIMS.includes(form.packingType)
  const showPly  = NEEDS_PLY.includes(form.packingType)

  const types = ['ALL', ...PACKING_TYPES]

  return (
    <div className="p-6">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packing Material Master</h1>
          <p className="text-sm text-gray-500 mt-1">Manage packing material specifications</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={openAdd}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 font-medium text-sm flex items-center gap-2"
          >
            + Create Packing Material
          </button>
          <BackButton />
        </div>
      </div>

      {/* ── Filters ────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Search by name or code…"
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-1 flex-wrap">
          {types.map(t => (
            <button
              key={t}
              onClick={() => { setFilterType(t); setPage(1) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                filterType === t
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} item{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────── */}
      {loading ? (
        <p className="text-gray-400 py-10 text-center">Loading…</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-700 text-white text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Item Code</th>
                  <th className="text-left px-4 py-3 font-semibold">Item Name</th>
                  <th className="text-left px-4 py-3 font-semibold">Type</th>
                  <th className="text-left px-4 py-3 font-semibold">Material</th>
                  <th className="text-left px-4 py-3 font-semibold">Capacity</th>
                  <th className="text-left px-4 py-3 font-semibold">Dimensions (L×W×H)</th>
                  <th className="text-left px-4 py-3 font-semibold">Color</th>
                  <th className="text-left px-4 py-3 font-semibold">UOM</th>
                  <th className="px-4 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-gray-400">
                      {search || filterType !== 'ALL'
                        ? 'No items match your filters.'
                        : 'No packing materials yet. Click "Create Packing Material" to add one.'}
                    </td>
                  </tr>
                ) : paginated.map(item => (
                  <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700 font-semibold">{item.itemCode}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.itemName}</td>
                    <td className="px-4 py-3">
                      <span className="bg-indigo-50 text-indigo-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {item.packingType}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.material || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {item.capacity != null ? `${item.capacity} ${item.capacityUnit || ''}` : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {item.length || item.width || item.height
                        ? `${item.length ?? '—'} × ${item.width ?? '—'} × ${item.height ?? '—'}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.color || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{item.uom}</td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button
                          onClick={() => openEdit(item)}
                          className="text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 text-xs font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => del(item.id, item.itemName)}
                          className="text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 text-xs font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 pb-2">
            <Pagination page={page} total={filtered.length} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
          </div>
        </div>
      )}

      {/* ── Create / Edit Modal ─────────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editing ? 'Edit Packing Material' : 'Create Packing Material'}
              </h2>
              <button
                onClick={() => setShowForm(false)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Form body */}
            <div className="px-6 py-5 space-y-4">
              {msg && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
                  {msg}
                </div>
              )}

              {/* Row 1: Code + Name */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Item Code" required>
                  <input
                    value={form.itemCode}
                    onChange={e => set('itemCode', e.target.value)}
                    placeholder="e.g. PM-BTL-001"
                    className={cls}
                  />
                </Field>
                <Field label="Item Name" required>
                  <input
                    value={form.itemName}
                    onChange={e => set('itemName', e.target.value)}
                    placeholder="e.g. 500 ml HDPE Bottle"
                    className={cls}
                  />
                </Field>
              </div>

              {/* Row 2: Type + Material */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Packing Type" required>
                  <select value={form.packingType} onChange={e => set('packingType', e.target.value)} className={cls}>
                    <option value="">Select type…</option>
                    {PACKING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Material">
                  <select value={form.material} onChange={e => set('material', e.target.value)} className={cls}>
                    <option value="">Select material…</option>
                    {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </Field>
              </div>

              {/* Row 3: Capacity + Unit */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Capacity">
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={form.capacity}
                    onChange={e => set('capacity', e.target.value)}
                    placeholder="e.g. 500"
                    className={cls}
                  />
                </Field>
                <Field label="Capacity Unit">
                  <select value={form.capacityUnit} onChange={e => set('capacityUnit', e.target.value)} className={cls}>
                    <option value="">Select unit…</option>
                    {CAPACITY_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              </div>

              {/* Dimensions — only for Box / Pouch */}
              {showDims && (
                <div className="grid grid-cols-3 gap-4">
                  <Field label="Length (mm)">
                    <input type="number" min="0" step="any" value={form.length}
                      onChange={e => set('length', e.target.value)} placeholder="L" className={cls} />
                  </Field>
                  <Field label="Width (mm)">
                    <input type="number" min="0" step="any" value={form.width}
                      onChange={e => set('width', e.target.value)} placeholder="W" className={cls} />
                  </Field>
                  <Field label="Height (mm)">
                    <input type="number" min="0" step="any" value={form.height}
                      onChange={e => set('height', e.target.value)} placeholder="H" className={cls} />
                  </Field>
                </div>
              )}

              {/* Ply — only for Box */}
              {showPly && (
                <Field label="Ply">
                  <input
                    type="number"
                    min="1"
                    step="1"
                    value={form.ply}
                    onChange={e => set('ply', e.target.value)}
                    placeholder="e.g. 3 (for 3-ply corrugated)"
                    className={cls}
                  />
                </Field>
              )}

              {/* Row: Shape + Color + UOM */}
              <div className="grid grid-cols-3 gap-4">
                <Field label="Shape">
                  <select value={form.shape} onChange={e => set('shape', e.target.value)} className={cls}>
                    <option value="">Select…</option>
                    {SHAPES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Color">
                  <select value={form.color} onChange={e => set('color', e.target.value)} className={cls}>
                    <option value="">Select…</option>
                    {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="UOM" required>
                  <select value={form.uom} onChange={e => set('uom', e.target.value)} className={cls}>
                    {UOMS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={save}
                disabled={saving}
                className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 border border-gray-300 py-2.5 rounded-lg hover:bg-gray-50 text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
