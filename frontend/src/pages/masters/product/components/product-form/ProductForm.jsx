import { Save, X } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { CANONICAL_UNITS } from '../../../../../utils/uom.js'

export default function ProductForm({ editing, form, onChange, saving, msg, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Product' : 'Add New Product'}</h2>
        {msg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Code *</label>
            <input
              value={form.productCode}
              onChange={e => onChange('productCode', e.target.value.toUpperCase())}
              disabled={!!editing}
              placeholder="e.g. PROD001"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500 disabled:bg-gray-100"
            />
          </div>
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
            <input
              value={form.plant}
              onChange={e => onChange('plant', e.target.value)}
              placeholder="e.g. Nano, Powder"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-400 mt-1">Comma separated if more than one plant is involved</p>
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
