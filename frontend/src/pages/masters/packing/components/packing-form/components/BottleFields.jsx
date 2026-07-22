import {
  MATERIALS_BTL, SHAPES, CAPACITY_UNITS,
  inp, Lbl, Field,
} from '../../packing-constants/packingConstants.jsx'

export default function BottleFields({ form, set }) {
  return (
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
    </>
  )
}
