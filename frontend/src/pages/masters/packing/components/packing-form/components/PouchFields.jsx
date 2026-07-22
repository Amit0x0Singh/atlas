import {
  MATERIALS_PCH, COLORS_PCH, CAPACITY_UNITS,
  inp, Lbl, Field,
} from '../../packing-constants/packingConstants.jsx'

export default function PouchFields({ form, set }) {
  return (
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
  )
}
