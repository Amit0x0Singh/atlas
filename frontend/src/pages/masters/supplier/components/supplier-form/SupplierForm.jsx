import { Save, X } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { normalizeEmailInput, normalizePhoneInput } from '../../../../../utils/textNormalize.js'

export default function SupplierForm({ editing, form, onChange, saving, msg, onSave, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Supplier' : 'Add New Supplier'}</h2>
        {msg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded mb-3 text-sm">{msg}</div>
        )}
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
            <input
              value={form.supplier_name}
              onChange={e => onChange('supplier_name', e.target.value)}
              placeholder="e.g. Acuro Organics"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                value={form.phone}
                onChange={e => onChange('phone', e.target.value)}
                onBlur={e => onChange('phone', normalizePhoneInput(e.target.value))}
                placeholder="e.g. 9876543210"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN</label>
              <input
                value={form.gstin}
                onChange={e => onChange('gstin', e.target.value.toUpperCase())}
                placeholder="e.g. 27ABCDE1234F1Z5"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              value={form.email}
              onChange={e => onChange('email', e.target.value)}
              onBlur={e => onChange('email', normalizeEmailInput(e.target.value))}
              placeholder="e.g. contact@supplier.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <textarea
              value={form.address}
              onChange={e => onChange('address', e.target.value)}
              rows={2}
              placeholder="e.g. Plot 12, MIDC Industrial Area, Pune"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <Button variant="primary" icon={Save} onClick={onSave} disabled={saving} loading={saving} fullWidth>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button variant="secondary" icon={X} onClick={onClose} fullWidth>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
