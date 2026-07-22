import { FlaskConical } from 'lucide-react'
import { PLANT_KEYS, PLANT_CONFIG } from '../../../data/plantConfig.js'
import { Field, SectionHeader, inputCls, inputBaseCls } from './formPrimitives.jsx'

const SHIFTS = ['A', 'B', 'C', 'General', 'Day', 'Night']
const BATCH_TYPES = ['Commercial', 'Pilot', 'R&D', 'Trial', 'Validation']
const BATCH_UOMS = ['L', 'kg', 'mL', 'g', 'MT', 'pcs']

export default function BatchDetailsForm({
  form, patch,
  productSuggestions, onProductSearch, onSelectProduct, recipeLoadedMsg,
  showSugg, setShowSugg,
  n, lastBatch,
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <SectionHeader icon={FlaskConical} title="Batch Details" description="Product, schedule and equipment for this requisition" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="col-span-full relative">
          <Field label="Product Name *">
            <input value={form.product}
              onChange={e => { patch({ product: e.target.value, productCode: '' }); onProductSearch(e.target.value); setShowSugg(true) }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="Type to search recipes in the Recipe Master…"
              className={inputCls} autoComplete="off" />
          </Field>
          {showSugg && productSuggestions.length > 0 && (
            <div className="absolute z-20 left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
              {productSuggestions.map(p => (
                <div key={p.productCode}
                  onMouseDown={() => { onSelectProduct(p.productCode, p.productName); setShowSugg(false) }}
                  className="px-3 py-2 text-[13px] hover:bg-indigo-50 cursor-pointer border-b border-slate-50 last:border-0 flex items-center justify-between">
                  <span className="font-medium text-slate-800">{p.productName}</span>
                  <span className="text-[11px] text-slate-400 font-mono">{p.productCode}</span>
                </div>
              ))}
            </div>
          )}
          {recipeLoadedMsg && (
            <p className="text-[12px] text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5 mt-1.5">{recipeLoadedMsg}</p>
          )}
          {/* No recipe matched what's typed — without this, an unmatched
              name (typo, or a product with no BOM in Recipe Master yet)
              silently leaves the components table empty with no clue why. */}
          {!recipeLoadedMsg && !form.productCode && form.product.trim() && productSuggestions.length === 0 && (
            <p className="text-[12px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-1.5">
              ⚠ No recipe found matching "{form.product.trim()}" in the Recipe Master — check the spelling, or add its BOM in the Recipe Library tab first.
            </p>
          )}
        </div>

        <Field label="DI Number">
          <input value={form.diNumber} onChange={e => patch({ diNumber: e.target.value })} placeholder="e.g. LT-26-018" className={inputCls} />
        </Field>
        <Field label="Shift">
          <select value={form.shift} onChange={e => patch({ shift: e.target.value })} className={inputCls}>
            {SHIFTS.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Batch Incharge">
          <input value={form.batchIncharge} onChange={e => patch({ batchIncharge: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Reactor / Equipment">
          <input value={form.reactor} onChange={e => patch({ reactor: e.target.value })} placeholder="e.g. Reactor-1" className={inputCls} />
        </Field>

        <Field label="Batch No (First) *">
          <input value={form.batchNo} onChange={e => patch({ batchNo: e.target.value })} placeholder="e.g. LT-RO260402" className={inputCls} />
          <div className="text-[11px] text-green-700 font-medium mt-1">
            {form.batchNo && n > 1 ? `Cycles ${n}: ${form.batchNo} → ${lastBatch}` : 'Auto-increments across cycles'}
          </div>
        </Field>
        <Field label="Type of Batch">
          <select value={form.batchType} onChange={e => patch({ batchType: e.target.value })} className={inputCls}>
            {BATCH_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Batch Size * & UOM">
          <div className="flex gap-2">
            <input type="number" value={form.batchSize} onChange={e => patch({ batchSize: e.target.value })}
              placeholder="e.g. 300" className={`${inputBaseCls} flex-1 min-w-0`} />
            <select value={form.batchSizeUom} onChange={e => patch({ batchSizeUom: e.target.value })}
              className={`${inputBaseCls} w-20 flex-shrink-0`}>
              {BATCH_UOMS.map(u => <option key={u}>{u}</option>)}
            </select>
          </div>
        </Field>
        <Field label="Plant *">
          <select value={form.section} onChange={e => patch({ section: e.target.value })} className={inputCls}>
            <option value="">— Select Plant —</option>
            {PLANT_KEYS.map(p => <option key={p} value={p}>{PLANT_CONFIG[p]?.label || p}</option>)}
          </select>
        </Field>

        <Field label="Date of Requisition">
          <input type="date" value={form.dateRequisition} onChange={e => patch({ dateRequisition: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Date Batch Planned">
          <input type="date" value={form.datePlanned} onChange={e => patch({ datePlanned: e.target.value })} className={inputCls} />
        </Field>
        <Field label="Remarks" span>
          <input value={form.remarks} onChange={e => patch({ remarks: e.target.value })}
            placeholder="General remarks (appears at bottom of BOM)" className={inputCls} />
        </Field>
      </div>
    </div>
  )
}
