import { useState } from 'react'
import { containerApi } from '../../../../../api/inventory.js'
import { rmApi } from '../../../../../api/inventory.js'

export default function CreateContainer({ onCreated }) {
  const [form, setForm] = useState({ containerId: '', itemCode: '', itemName: '', capacity: '', uom: 'KG' })
  const [submitting, setSub] = useState(false)
  const [error, setError]    = useState('')
  const [created, setCreated] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const lookupItem = async () => {
    if (!form.itemCode.trim()) return
    try {
      const r = await rmApi.get(form.itemCode.trim().toUpperCase())
      set('itemName', r.data.itemName)
      set('uom', r.data.uom || 'KG')
    } catch { /* item not in RM master — user types manually */ }
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!form.containerId || !form.itemCode || !form.itemName || !form.capacity || !form.uom) {
      setError('All fields are required'); return
    }
    setSub(true); setError('')
    try {
      const r = await containerApi.create({
        ...form,
        containerId: form.containerId.trim().toUpperCase(),
        itemCode: form.itemCode.trim().toUpperCase(),
        capacity: parseFloat(form.capacity),
      })
      setCreated(r.data)
      onCreated?.()
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  if (created) return (
    <div className="p-6 max-w-md">
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-bold text-green-800 mb-1">Container Created!</h3>
        <p className="text-green-700 text-sm mb-1 font-mono">{created.containerId}</p>
        <p className="text-green-600 text-sm mb-4">{created.itemName} — Cap: {created.capacity} {created.uom}</p>
        <div className="flex gap-3 justify-center">
          <a
            href={containerApi.labelUrl(created.containerId)}
            target="_blank"
            rel="noreferrer"
            className="bg-orange-500 text-white px-5 py-2.5 rounded-lg font-semibold text-sm hover:bg-orange-600"
          >
            Print QR Label
          </a>
          <button
            onClick={() => { setCreated(null); setForm({ containerId: '', itemCode: '', itemName: '', capacity: '', uom: 'KG' }) }}
            className="border border-gray-300 px-5 py-2.5 rounded-lg text-sm hover:bg-gray-50"
          >
            Create Another
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="p-6 max-w-md">
      <p className="text-sm text-gray-500 mb-5">
        Create a physical container (drum, jerry can, bin) for a raw material. Each container gets a unique QR label.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Container ID *</label>
          <input
            value={form.containerId}
            onChange={e => set('containerId', e.target.value.toUpperCase())}
            placeholder="e.g. DRUM-AZOS-001"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-400"
          />
          <p className="text-xs text-gray-400 mt-1">This ID will be encoded in the QR code</p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">RM Item Code *</label>
          <div className="flex gap-2">
            <input
              value={form.itemCode}
              onChange={e => set('itemCode', e.target.value.toUpperCase())}
              onBlur={lookupItem}
              placeholder="e.g. AZOS"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button type="button" onClick={lookupItem}
              className="border border-gray-300 px-3 py-2 rounded-lg text-sm hover:bg-gray-50">
              Lookup
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Item Name *</label>
          <input
            value={form.itemName}
            onChange={e => set('itemName', e.target.value)}
            placeholder="e.g. Azospirillum"
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Capacity *</label>
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={form.capacity}
              onChange={e => set('capacity', e.target.value)}
              placeholder="e.g. 50"
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">UOM *</label>
            <select
              value={form.uom}
              onChange={e => set('uom', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400"
            >
              <option>KG</option>
              <option>L</option>
              <option>G</option>
              <option>ML</option>
              <option>MT</option>
            </select>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 disabled:opacity-50"
        >
          {submitting ? 'Creating…' : 'Create Container + Generate QR'}
        </button>
      </form>
    </div>
  )
}
