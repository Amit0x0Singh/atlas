import { useState } from 'react'
import { Save, X, Plus } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { CANONICAL_UNITS } from '../../../../../utils/uom.js'

// Multi-value picker for ProductMaster.plant (a String[] column) — chips for
// the selected plants, one-click add for plants already used elsewhere
// (sourced from the live distinct-values list, same data the Plant filter
// dropdown uses), plus free-text add since plant isn't a closed master list.
function PlantPicker({ value, onChange, options }) {
  const [draft, setDraft] = useState('')
  const selected = value || []
  const knownOptions = options.filter(o => !selected.includes(o))

  const addPlant = (name) => {
    const trimmed = name.trim()
    if (!trimmed || selected.includes(trimmed)) return
    onChange([...selected, trimmed])
  }
  const removePlant = (name) => onChange(selected.filter(p => p !== name))

  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-2 min-h-[26px]">
        {selected.length === 0 && <span className="text-xs text-gray-300 italic">No plants selected</span>}
        {selected.map(p => (
          <span key={p} className="inline-flex items-center gap-1 bg-green-50 text-green-700 border border-green-200 rounded-full pl-2.5 pr-1.5 py-1 text-xs font-semibold">
            {p}
            <button type="button" onClick={() => removePlant(p)} className="text-green-400 hover:text-green-600 leading-none">
              <X size={12} />
            </button>
          </span>
        ))}
      </div>

      {knownOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {knownOptions.map(o => (
            <button key={o} type="button" onClick={() => addPlant(o)}
              className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-500 hover:border-green-400 hover:text-green-700 transition-colors"
            >
              + {o}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlant(draft); setDraft('') } }}
          placeholder="Add a new plant…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
        />
        <Button type="button" variant="outline-gray" size="sm" icon={Plus} onClick={() => { addPlant(draft); setDraft('') }}>
          Add
        </Button>
      </div>
    </div>
  )
}

export default function ProductForm({ editing, form, onChange, saving, msg, onSave, onClose, plantOptions = [] }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-1">{editing ? 'Edit Product' : 'Add New Product'}</h2>
        {!editing && (
          <p className="text-xs text-gray-400 mb-3">Product code is generated automatically (PR00001, PR00002, ...)</p>
        )}
        {msg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>
        )}
        <div className="space-y-3">
          {editing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Code</label>
              <input
                value={form.productCode}
                disabled
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none bg-gray-100 font-mono"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input
              value={form.productName}
              onChange={e => onChange('productName', e.target.value)}
              placeholder="e.g. NPK Biofertilizer"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UOM</label>
              <select
                value={form.uom || ''}
                onChange={e => onChange('uom', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">—</option>
                {CANONICAL_UNITS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={form.state || ''}
                onChange={e => onChange('state', e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">—</option>
                <option value="SOLID">Solid</option>
                <option value="LIQUID">Liquid</option>
                <option value="GAS">Gas</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
            <PlantPicker value={form.plant} onChange={v => onChange('plant', v)} options={plantOptions} />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="success" icon={Save} onClick={onSave} disabled={saving} loading={saving} fullWidth>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="secondary" icon={X} onClick={onClose} fullWidth>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
