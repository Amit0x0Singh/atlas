import { Button, IconButton } from '../../../../../components/ui'
import { Can } from '../../../../../components/common/Can.jsx'
import { X } from 'lucide-react'

import { toTitleCase } from '../../../../../utils/textDisplay.js'
export default function CreateIndentModal({
  form, setForm, error,
  prodSearch, setProdSearch, showProdDrop, setShowProdDrop, filteredProducts, onSelectProduct,
  sfgInfo, setStockCheck, setBatchNoAuto, setSfgInfo,
  batchNoAuto, loadingBatchNo,
  onBatchSizeChange,
  recipePreview, checkingStock, stockCheck, shortfallItems,
  equipmentList,
  creating,
  onSubmit, onClose,
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-40 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mt-8 mb-8">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Create Production Indent</h2>
          <IconButton icon={X} tooltip="Close" onClick={onClose} />
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">O {error}</div>}

          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
            <input value={prodSearch}
              onChange={e => { setProdSearch(e.target.value); setShowProdDrop(true); setForm(f => ({ ...f, productCode: '', productName: '' })); setStockCheck(null); setBatchNoAuto(''); setSfgInfo(null) }}
              onFocus={() => setShowProdDrop(true)}
              onBlur={() => setTimeout(() => setShowProdDrop(false), 200)}
              placeholder="Type to search product..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            {showProdDrop && filteredProducts.length > 0 && (
              <div className="absolute z-20 w-full bg-white border border-gray-200 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                {filteredProducts.map(p => (
                  <button key={p.productCode} type="button" onMouseDown={() => onSelectProduct(p)}
                    className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm">
                    <span className="font-medium">{toTitleCase(p.productName)}</span>
                    <span className="text-gray-400 ml-2 text-xs">{p.productCode}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {form.productCode && (
            <div className="bg-blue-50 border border-blue-100 px-3 py-2 rounded-lg text-sm text-blue-800 flex items-center gap-2">
              o. <strong>{toTitleCase(form.productName)}</strong>
              <span className="text-blue-400 font-mono text-xs">[{form.productCode}]</span>
            </div>
          )}

          {sfgInfo && sfgInfo.totalSfg > 0 && (
            <div className="bg-amber-50 border border-amber-200 px-4 py-3 rounded-lg text-sm text-amber-800">
              "️ Available SFG: <strong>{Number(sfgInfo.totalSfg).toFixed(2)}</strong> units from previous batches.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Size *</label>
              <input type="number" step="0.01" value={form.batchSize}
                onChange={e => onBatchSizeChange(e.target.value)} placeholder="e.g. 1000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch No * {loadingBatchNo && <span className="text-xs text-blue-400">fetching...</span>}
                {batchNoAuto && !loadingBatchNo && <span className="text-xs text-green-600 ml-1">(auto)</span>}
              </label>
              <input value={form.batchNo} onChange={e => setForm(f => ({ ...f, batchNo: e.target.value }))}
                placeholder="Auto-generated"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {recipePreview.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">BOM Preview — {recipePreview.length} Items</span>
                {checkingStock && <span className="text-xs text-blue-500 animate-pulse">Checking stock?</span>}
                {stockCheck && !checkingStock && (
                  <span className={`text-xs font-semibold ${stockCheck.allOk ? 'text-green-600' : 'text-red-600'}`}>
                    {stockCheck.allOk ? 'o. All available' : `s ${shortfallItems.length} short`}
                  </span>
                )}
              </div>
              <div className="overflow-x-auto max-h-44">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left text-gray-500">Item Name</th>
                      <th className="px-3 py-2 text-right text-gray-500">Required</th>
                      <th className="px-3 py-2 text-right text-gray-500">Available</th>
                      <th className="px-3 py-2 text-center text-gray-500">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipePreview.map(r => (
                      <tr key={r.rmCode} className={`border-t ${r.ok ? '' : 'bg-red-50'}`}>
                        <td className="px-3 py-1.5 font-medium">{toTitleCase(r.rmName)}</td>
                        <td className="px-3 py-1.5 text-right">{Number(r.required || r.requiredQty).toFixed(3)}</td>
                        <td className={`px-3 py-1.5 text-right font-semibold ${r.ok ? 'text-green-700' : 'text-red-600'}`}>
                          {Number(r.available || r.availableQty).toFixed(3)}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {r.ok ? <span className="text-green-600 font-bold">o"</span>
                            : <span className="text-red-600 text-xs font-bold">^'{Number(r.shortfall).toFixed(3)}</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">DI No *</label>
            <input value={form.diNo} onChange={e => setForm(f => ({ ...f, diNo: e.target.value }))}
              placeholder="e.g. DI-2026-042"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plant</label>
              <input value={form.plant} onChange={e => setForm(f => ({ ...f, plant: e.target.value }))}
                placeholder="Plant A"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
              <select value={form.equipment} onChange={e => setForm(f => ({ ...f, equipment: e.target.value, cycleBatchSize: '' }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Select (optional) —</option>
                {equipmentList.map(eq => (
                  <option key={eq.equipId} value={eq.equipName}>{toTitleCase(eq.equipName)}{eq.plant ? ` (${eq.plant})` : ''}</option>
                ))}
              </select>
            </div>
          </div>

          {form.equipment && (
            <div className="border border-indigo-200 bg-indigo-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-indigo-700 font-semibold text-sm">sT️ Multi-Cycle Production</span>
                <span className="text-xs text-indigo-500">Equipment selected: {form.equipment}</span>
              </div>
              <p className="text-xs text-indigo-600 mb-3">
                If your equipment can't process the full batch at once, set the cycle size. Each cycle = one blender run.
              </p>
              <div className="grid grid-cols-3 gap-3 items-end">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-indigo-700 mb-1">Cycle Batch Size (per run)</label>
                  <input type="number" step="0.01" min="1" value={form.cycleBatchSize}
                    onChange={e => setForm(f => ({ ...f, cycleBatchSize: e.target.value }))}
                    placeholder={`e.g. ${form.batchSize ? Math.round(parseFloat(form.batchSize) / 5) || 1000 : 1000}`}
                    className="w-full border border-indigo-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400 bg-white" />
                </div>
                <div className="text-center">
                  {form.cycleBatchSize && form.batchSize && parseFloat(form.cycleBatchSize) > 0 ? (() => {
                    const cycles = Math.round(parseFloat(form.batchSize) / parseFloat(form.cycleBatchSize))
                    return (
                      <div className="bg-indigo-600 text-white rounded-lg px-3 py-2">
                        <div className="text-2xl font-bold">{cycles}</div>
                        <div className="text-xs">cycle{cycles !== 1 ? 's' : ''}</div>
                      </div>
                    )
                  })() : <div className="bg-gray-100 text-gray-400 rounded-lg px-3 py-2 text-xs">Enter cycle size</div>}
                </div>
              </div>
              {form.cycleBatchSize && form.batchSize && parseFloat(form.cycleBatchSize) > 0 && (() => {
                const cycles = Math.round(parseFloat(form.batchSize) / parseFloat(form.cycleBatchSize))
                return (
                  <div className="mt-2 bg-white border border-indigo-200 rounded-lg px-3 py-2 text-xs text-indigo-800">
                    Will create <strong>{cycles} indents</strong> of <strong>{parseFloat(form.cycleBatchSize).toFixed(2)} KG</strong> each
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t flex gap-3">
          <Can permission="production.indent.create">
            <Button variant="primary" fullWidth loading={creating} disabled={creating} onClick={onSubmit}>
              {creating ? 'Creating...' : checkingStock ? 'Checking Stock...' : (() => {
                if (form.cycleBatchSize && form.batchSize && parseFloat(form.cycleBatchSize) > 0) {
                  const n = Math.round(parseFloat(form.batchSize) / parseFloat(form.cycleBatchSize))
                  return `Create ${n} Cycle Indent${n !== 1 ? 's' : ''}`
                }
                return 'Create Indent'
              })()}
            </Button>
          </Can>
          <Button variant="secondary" fullWidth onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
