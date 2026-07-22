import { X, Save } from 'lucide-react'
import { Button, IconButton } from '../../../../../../components/ui/index.js'
import { CATEGORIES, CAT, SUB_TYPES, inp, Lbl, Field } from '../../packing-constants/packingConstants.jsx'
import BottleFields from '../components/BottleFields.jsx'
import PouchFields from '../components/PouchFields.jsx'
import BoxFields from '../components/BoxFields.jsx'

export default function PackingForm({ editing, form, onChange, saving, msg, onSave, onClose }) {
  const set = (k, v) => onChange(k, v)
  const catMeta = form.category ? (CAT[form.category] || null) : null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-y-auto py-8 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {editing ? 'Edit Packing Material' : 'New Packing Material'}
            </h2>
            {editing && (
              <p className="text-xs text-gray-400 mt-0.5">
                Code: <span className={`font-mono font-bold ${catMeta?.cls.text}`}>{editing.itemCode}</span>
              </p>
            )}
          </div>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>

        <div className="px-6 py-5 space-y-5 max-h-[72vh] overflow-y-auto">
          {msg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2.5 rounded-lg text-sm">{msg}</div>
          )}

          {/* Step 1 — Category */}
          <div>
            <Lbl text="Category" req />
            <div className="grid grid-cols-3 gap-3">
              {CATEGORIES.map(cat => (
                <button key={cat.value} type="button"
                  onClick={() => onChange('_resetCategory', cat.value)}
                  className={`p-3.5 border-2 rounded-xl text-center transition-all ${
                    form.category === cat.value
                      ? `${cat.cls.border} ${cat.cls.light} ring-2 ${cat.cls.ring}`
                      : 'border-gray-200 hover:border-gray-300 bg-gray-50'
                  }`}>
                  <div className={`flex justify-center mb-1.5 ${form.category === cat.value ? cat.cls.text : 'text-gray-500'}`}><cat.icon size={22} strokeWidth={1.6} /></div>
                  <div className="text-[11px] font-bold text-gray-700 leading-snug">{cat.label}</div>
                  <div className={`text-[10px] font-mono mt-1 ${cat.cls.text}`}>{cat.prefix}-001…</div>
                </button>
              ))}
            </div>
          </div>

          {form.category && (
            <>
              {/* Step 2 — Sub-type */}
              <div>
                <Lbl text="Type" req />
                <div className="flex flex-wrap gap-2">
                  {(SUB_TYPES[form.category] || []).map(s => (
                    <button key={s.value} type="button"
                      onClick={() => set('subType', form.subType === s.value ? '' : s.value)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        form.subType === s.value
                          ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300 bg-white'
                      }`}>
                      <s.icon size={14} />{s.value}
                    </button>
                  ))}
                </div>
              </div>

              {/* Step 3 — Base name */}
              <Field label="Product Name (short — specs in fields below)" req>
                <input value={form.itemName} onChange={e => set('itemName', e.target.value)}
                  placeholder={
                    form.category === 'CORRUGATED_BOXES' ? 'e.g. 5 PLY CBB' :
                    form.category === 'POUCHES_BAGS'     ? 'e.g. Silver Laminated Pouch' :
                                                           'e.g. HDPE Triangle Container'
                  }
                  className={inp} />
              </Field>

              {form.category === 'BOTTLES_TINS'     && <BottleFields form={form} set={set} />}
              {form.category === 'POUCHES_BAGS'     && <PouchFields form={form} set={set} />}
              {form.category === 'CORRUGATED_BOXES' && <BoxFields form={form} set={set} />}

              {/* Stock Quantity */}
              <div className="grid grid-cols-2 gap-4">
                <Field label="Quantity in Stock">
                  <div className="relative">
                    <input
                      type="number" min="0" step="1"
                      value={form.quantity}
                      onChange={e => set('quantity', e.target.value)}
                      placeholder="0"
                      className={inp}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium pointer-events-none">
                      {form.uom || 'Nos'}
                    </span>
                  </div>
                </Field>
              </div>

              <Field label="Notes / Remarks">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                  placeholder="Any additional details…" className={`${inp} resize-none`} />
              </Field>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <Button variant="purple" icon={Save} onClick={onSave} disabled={saving || !form.category} loading={saving} fullWidth>
            {saving ? 'Saving…' : editing ? 'Update' : 'Create'}
          </Button>
          <Button variant="secondary" icon={X} onClick={onClose} fullWidth>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
