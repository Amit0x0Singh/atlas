import { Layers, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { PLANT_CONFIG } from '../../../data/plantConfig.js'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

export default function SummarySidebar({ form, recipeLoadedMsg, n, lastBatch, totalQty, componentCount }) {
  return (
    <aside className="space-y-4 xl:sticky xl:top-6">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Product</p>
        {form.product.trim() ? (
          <>
            <p className="text-[14px] font-bold text-slate-800 leading-snug">{toTitleCase(form.product)}</p>
            {form.productCode && <p className="text-[11px] font-mono text-slate-400 mt-0.5">{form.productCode}</p>}
            <div className="mt-2.5">
              {recipeLoadedMsg ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-1">
                  <CheckCircle2 size={12} /> Recipe loaded
                </span>
              ) : form.productCode ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                  <Info size={12} /> Loading recipe…
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 bg-red-50 border border-red-200 rounded-full px-2.5 py-1">
                  <AlertTriangle size={12} /> No matching recipe
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-[12.5px] text-slate-400">No product selected yet — search above or paste a schedule row.</p>
        )}
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3">Batch Summary</p>
        <dl className="space-y-2 text-[12.5px]">
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">Batch range</dt>
            <dd className="font-semibold text-slate-700 text-right">{form.batchNo ? (n > 1 ? `${form.batchNo} → ${lastBatch}` : form.batchNo) : '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">Cycles</dt>
            <dd className="font-semibold text-slate-700">{n}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">Total quantity</dt>
            <dd className="font-semibold text-slate-700">{totalQty ? `${totalQty.toLocaleString()} ${form.batchSizeUom}` : '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">Plant</dt>
            <dd className="font-semibold text-slate-700">{form.section ? (PLANT_CONFIG[form.section]?.label || form.section) : '—'}</dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-slate-400">Type</dt>
            <dd className="font-semibold text-slate-700">{form.batchType}</dd>
          </div>
        </dl>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <Layers size={13} /> Components
        </p>
        <p className="text-2xl font-bold text-slate-800">{componentCount}</p>
        <p className="text-[11.5px] text-slate-400 mt-0.5">ingredient row{componentCount === 1 ? '' : 's'} in this BOM</p>
      </div>
    </aside>
  )
}
