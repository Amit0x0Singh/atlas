import { Plus, CheckCircle2 } from 'lucide-react'
import {
  COLORS_CBB, LAMINATES,
  inp, Lbl, Field,
} from '../../packing-constants/packingConstants.jsx'

const PLY_PRESETS = [3, 5, 7]

export default function BoxFields({ form, set }) {
  return (
    <>
      <div>
        <Lbl text="Ply" req />
        <div className="flex flex-wrap gap-2 items-center">
          {PLY_PRESETS.map(p => (
            <button key={p} type="button"
              onClick={() => set('ply', form.ply === String(p) ? '' : String(p))}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${form.ply === String(p) ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
              {p} PLY
            </button>
          ))}

          {/* Custom ply input */}
          <div className="flex items-center gap-1.5 ml-1">
            <input
              type="number" min="1" max="99" step="1"
              value={form._customPly || ''}
              onChange={e => set('_customPly', e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && form._customPly) {
                  e.preventDefault()
                  set('ply', String(parseInt(form._customPly)))
                }
              }}
              placeholder="Other"
              className="w-20 border border-dashed border-gray-300 rounded-lg px-2 py-2 text-sm text-center outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400"
            />
            <button type="button"
              onClick={() => { if (form._customPly) set('ply', String(parseInt(form._customPly))) }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors">
              <Plus size={12} /> PLY
            </button>
          </div>
        </div>

        {/* Show custom selected ply indicator if not a preset */}
        {form.ply && !PLY_PRESETS.includes(Number(form.ply)) && (
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-300 rounded-lg text-sm font-bold text-emerald-700">
            <CheckCircle2 size={14} /> {form.ply} PLY selected
          </div>
        )}
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
    </>
  )
}
