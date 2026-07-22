import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import ComponentsTable from '../../components-table/ComponentsTable.jsx'
import { incrCode } from '../../../utils/bomPrintTemplates.js'
import SchedulePasteZone from '../components/SchedulePasteZone.jsx'
import BatchDetailsForm from '../components/BatchDetailsForm.jsx'
import IssuanceSettings from '../components/IssuanceSettings.jsx'
import SummarySidebar from '../components/SummarySidebar.jsx'

export default function IssueBomTab({
  form, setForm, rows, setRows, settings, setSettings,
  productSuggestions, onProductSearch, onSelectProduct, recipeLoadedMsg,
  onGenerate, generating, error,
  rmList, products, onSaveCorrections, savingCorrections,
}) {
  const [showSugg, setShowSugg] = useState(false)

  const patch = (fields) => setForm(f => ({ ...f, ...fields }))

  const n = Math.max(1, parseInt(form.cycles, 10) || 1)
  const lastBatch = form.batchNo ? incrCode(form.batchNo, n - 1) : ''
  const componentCount = rows.filter(r => r.comp?.trim() && !r.comp.trim().startsWith('##')).length
  const totalQty = form.batchSize ? (parseFloat(form.batchSize || 0) * n) : 0

  return (
    <div className="max-w-[1700px] mx-auto p-6">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-5">
          <AlertTriangle size={16} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
        {/* ── Main column ─────────────────────────────────────────── */}
        <div className="space-y-5 min-w-0">
          <SchedulePasteZone patch={patch} />

          <BatchDetailsForm
            form={form} patch={patch}
            productSuggestions={productSuggestions} onProductSearch={onProductSearch}
            onSelectProduct={onSelectProduct} recipeLoadedMsg={recipeLoadedMsg}
            showSugg={showSugg} setShowSugg={setShowSugg}
            n={n} lastBatch={lastBatch}
          />

          <ComponentsTable
            rows={rows} onChange={setRows}
            rmList={rmList} products={products} onSaveCorrections={onSaveCorrections} savingCorrections={savingCorrections}
          />

          <IssuanceSettings
            form={form} patch={patch} settings={settings} setSettings={setSettings}
            n={n} lastBatch={lastBatch} totalQty={totalQty}
          />

          <button type="button" onClick={onGenerate} disabled={generating}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl transition-colors shadow-sm hover:shadow-md">
            {generating ? 'Issuing…' : '✅ Issue BOM(s)'}
          </button>
        </div>

        <SummarySidebar
          form={form} recipeLoadedMsg={recipeLoadedMsg}
          n={n} lastBatch={lastBatch} totalQty={totalQty} componentCount={componentCount}
        />
      </div>
    </div>
  )
}
