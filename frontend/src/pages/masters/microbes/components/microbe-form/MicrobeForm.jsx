import { Save, X } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { CANONICAL_UNITS } from '../../../../../utils/uom.js'

export default function MicrobeForm({ editId, form, onChange, saving, onSubmit, onCancel }) {
  return (
    <div className="p-6">
      <h3 className="text-lg font-bold text-gray-900 mb-5">
        {editId ? 'Edit Microbe' : 'Add New Microbe'}
      </h3>
      <form onSubmit={onSubmit}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Microbe Name *</label>
            <input
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Bacillus velezensis"
              value={form.microbe_name}
              onChange={e => onChange('microbe_name', e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
              Microbe Code <span className="font-normal normal-case text-gray-400">(auto-generated)</span>
            </label>
            <input
              className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2 text-sm font-mono text-gray-500 outline-none"
              value={editId ? form.microbe_code : 'Assigned on save, e.g. mc00001'}
              disabled
              readOnly
            />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">UOM *</label>
            <select
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              value={form.uom}
              onChange={e => onChange('uom', e.target.value)}
            >
              {CANONICAL_UNITS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="submit" variant="primary" icon={Save} disabled={saving} loading={saving}>
            {saving ? 'Saving...' : editId ? 'Update' : 'Add to Master'}
          </Button>
          <Button type="button" variant="secondary" icon={X} onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </div>
  )
}
