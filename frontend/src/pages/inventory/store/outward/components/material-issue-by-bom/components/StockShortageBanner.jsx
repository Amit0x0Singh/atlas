import { useState, useEffect } from 'react'
import { indentApi } from '../../../../../../../api/production.js'
import IndentForm from './IndentForm.jsx'

const THEME = {
  amber:  { border: 'border-amber-300',  bg: 'bg-amber-50',  title: 'text-amber-800',  body: 'text-amber-700',  divider: 'border-amber-200',  btn: 'bg-amber-600 hover:bg-amber-700' },
  orange: { border: 'border-orange-300', bg: 'bg-orange-50', title: 'text-orange-800', body: 'text-orange-700', divider: 'border-orange-200', btn: 'bg-orange-500 hover:bg-orange-600' },
}

// Covers both "no stock at all" and "stock insufficient" cases — same
// shortage banner + purchase-indent flow, just a different theme/message.
export default function StockShortageBanner({
  theme, title, message,
  selProduct, batchQty, batchUom, batchRef, diNo,
}) {
  const t = THEME[theme]
  const [showIndent, setShowIndent]       = useState(false)
  const [indentDiNo, setIndentDiNo]       = useState(diNo || '')
  const [indentBatchNo, setIndentBatchNo] = useState(batchRef || '')
  const [indentPlant, setIndentPlant]     = useState('')
  const [indentLoading, setIndentLoading] = useState(false)
  const [indentResult, setIndentResult]   = useState(null)
  const [indentErr, setIndentErr]         = useState('')

  // Keep local copies in sync if parent values change (e.g. task re-selected)
  useEffect(() => { setIndentDiNo(diNo || '') }, [diNo])
  useEffect(() => { setIndentBatchNo(batchRef || '') }, [batchRef])

  async function handleIndentSubmit() {
    if (!selProduct?.productCode || !indentDiNo.trim() || !indentBatchNo.trim() || !batchQty) {
      setIndentErr('Product, DI No, Batch No and Batch Size are all required')
      return
    }
    setIndentLoading(true); setIndentErr('')
    try {
      const r = await indentApi.create({
        productCode: selProduct.productCode,
        productName: selProduct.productName,
        diNo:        indentDiNo.trim(),
        batchNo:     indentBatchNo.trim(),
        batchSize:   parseFloat(batchQty),
        plant:       indentPlant,
      })
      setIndentResult(r)
      setShowIndent(false)
    } catch (e) {
      setIndentErr(e?.response?.data?.error || e.message)
    } finally {
      setIndentLoading(false)
    }
  }

  return (
    <div className={`rounded-xl border ${t.border} ${t.bg} px-4 py-3`}>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-bold ${t.title}`}>{title}</p>
          <p className={`text-xs ${t.body} mt-0.5 leading-relaxed`}>{message}</p>
        </div>
        {!showIndent && !indentResult && (
          <button
            type="button"
            onClick={() => setShowIndent(true)}
            className={`self-start sm:shrink-0 text-xs font-bold ${t.btn} text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap`}>
            Raise Purchase Indent
          </button>
        )}
      </div>

      {showIndent && !indentResult && (
        <IndentForm
          theme={theme}
          productName={selProduct?.productName}
          diNo={indentDiNo} setDiNo={setIndentDiNo}
          batchNo={indentBatchNo} setBatchNo={setIndentBatchNo}
          batchQty={batchQty} batchUom={batchUom}
          plant={indentPlant} setPlant={setIndentPlant}
          error={indentErr}
          loading={indentLoading}
          onCancel={() => { setShowIndent(false); setIndentErr('') }}
          onSubmit={handleIndentSubmit}
        />
      )}

      {indentResult && (
        <div className={`mt-3 pt-3 border-t ${t.divider}`}>
          <p className="text-xs font-bold text-green-700 mb-1">Indent raised successfully!</p>
          {indentResult.stockChecks?.length > 0 && (
            <div className="space-y-0.5 mb-1">
              {indentResult.stockChecks.map((c, i) => (
                <div key={i} className="flex justify-between text-xs text-red-700">
                  <span>{c.rmName}</span>
                  <span className="font-semibold">Short: {Number(c.shortfall).toFixed(3)} kg</span>
                </div>
              ))}
            </div>
          )}
          <p className={`text-xs ${t.body}`}>{indentResult.message}</p>
        </div>
      )}
    </div>
  )
}
