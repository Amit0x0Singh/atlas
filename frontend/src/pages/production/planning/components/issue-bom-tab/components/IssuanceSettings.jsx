import { Settings2, Sparkles } from 'lucide-react'
import { Field, SectionHeader, inputCls } from './formPrimitives.jsx'

export default function IssuanceSettings({ form, patch, settings, setSettings, n, lastBatch, totalQty }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <SectionHeader icon={Settings2} title="Issuance Settings" description="Cycles and which paperwork gets attached" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Field label="Number of Cycles / Batches">
          <input type="number" min={1} value={form.cycles} onChange={e => patch({ cycles: e.target.value })} className={inputCls} />
        </Field>
        {form.batchNo && (
          <div className="sm:col-span-2 bg-slate-50 border border-slate-100 rounded-lg px-3.5 py-2.5 text-[12px] text-slate-600 flex items-center">
            Batches: <b>{form.batchNo}</b> → <b>{lastBatch}</b>{form.batchSize ? <> · Total: <b>{totalQty.toLocaleString()} {form.batchSizeUom}</b></> : ''}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
        <label className="flex items-center gap-2 bg-slate-50 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-slate-100 transition-colors">
          <input type="checkbox" checked={settings.showTotal} onChange={e => setSettings(s => ({ ...s, showTotal: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
          <span className="font-medium text-slate-700">Show Total Quantity row at bottom of BOM</span>
        </label>
        <label className="flex items-center gap-2 bg-slate-50 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-slate-100 transition-colors">
          <input type="checkbox" checked={settings.inclMasterSheet} onChange={e => setSettings(s => ({ ...s, inclMasterSheet: e.target.checked }))} className="w-4 h-4 accent-indigo-600" />
          <span className="font-medium text-slate-700">Include Master Requisition Sheet</span>
        </label>
        <label className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-red-100/60 transition-colors">
          <input type="checkbox" checked={settings.skipCycleBOMs} onChange={e => setSettings(s => ({ ...s, skipCycleBOMs: e.target.checked }))} className="w-4 h-4 accent-red-600" />
          <span className="font-medium text-red-700">Skip individual cycle BOMs</span>
        </label>
        <label className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3.5 py-2.5 text-[13px] cursor-pointer hover:bg-orange-100/60 transition-colors">
          <input type="checkbox" checked={settings.sectionOnlyBMR} onChange={e => setSettings(s => ({ ...s, sectionOnlyBMR: e.target.checked }))} className="w-4 h-4 accent-orange-600" />
          <span className="font-medium text-orange-700">Section-Summary BMR</span>
        </label>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
        <p className="text-[13px] font-semibold text-amber-800 mb-2 flex items-center gap-1.5">
          <Sparkles size={14} /> Batch Sheets — driven by Plant selected above
        </p>
        {form.section === 'Nano' ? (
          <div className="bg-blue-50 border border-blue-300 rounded-lg px-3.5 py-2.5 text-[13px] text-blue-900">
            <b>📘 Nano Technology Plant</b> — all 4 batch report pages (Pre-Start Checklist, Reactor Cleaning &amp; Batch
            Start, Formulation Protocol, QC Form) are auto-attached to each BOM cycle.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              ['inclTechnical', 'Technical Sheet', 'Microbial culture prep'],
              ['inclFormulation', 'Formulation Sheet', 'BOM components + blending'],
              ['inclPacking', 'Packing Sheet', 'Packing, labelling, dispatch'],
              ['inclCOA', 'COA Sheet', 'Certificate of Analysis'],
            ].map(([key, title, desc]) => (
              <label key={key} className="flex items-center gap-2.5 bg-white border border-amber-200 rounded-lg px-3 py-2 text-[13px] cursor-pointer hover:border-amber-400 transition-colors">
                <input type="checkbox" checked={settings[key]} onChange={e => setSettings(s => ({ ...s, [key]: e.target.checked }))} className="w-4 h-4 accent-amber-600" />
                <span><b>{title}</b><br /><span className="text-[11px] text-slate-500">{desc}</span></span>
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
