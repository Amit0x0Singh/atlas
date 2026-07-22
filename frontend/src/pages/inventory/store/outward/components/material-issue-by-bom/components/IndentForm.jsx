const RING = {
  amber:  'focus:ring-amber-400',
  orange: 'focus:ring-orange-400',
}
const BTN = {
  amber:  'bg-amber-600 hover:bg-amber-700',
  orange: 'bg-orange-500 hover:bg-orange-600',
}
const TITLE = {
  amber:  'text-amber-700',
  orange: 'text-orange-700',
}
const DIVIDER = {
  amber:  'border-amber-200',
  orange: 'border-orange-200',
}

export default function IndentForm({
  theme, productName,
  diNo, setDiNo, batchNo, setBatchNo, batchQty, batchUom,
  plant, setPlant, error, loading, onCancel, onSubmit,
}) {
  const ring = RING[theme]
  return (
    <div className={`mt-3 pt-3 border-t ${DIVIDER[theme]}`}>
      <p className={`text-[10px] font-bold ${TITLE[theme]} uppercase tracking-wider mb-2`}>
        Purchase Indent — {productName || 'Product'}
      </p>
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">DI No. *</label>
          <input value={diNo} onChange={e => setDiNo(e.target.value)}
            placeholder="e.g. LT-26-018"
            className={`w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ${ring}`} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Batch No. *</label>
          <input value={batchNo} onChange={e => setBatchNo(e.target.value)}
            placeholder="e.g. NP-20260701-01"
            className={`w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:ring-2 ${ring}`} />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Batch Size ({batchUom})</label>
          <input value={batchQty} readOnly
            className="w-full border border-gray-100 bg-gray-50 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 cursor-not-allowed" />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-gray-500 block mb-1">Plant</label>
          <select value={plant} onChange={e => setPlant(e.target.value)}
            className={`w-full border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs bg-white outline-none focus:ring-2 ${ring}`}>
            <option value="">— Select —</option>
            {['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules'].map(p => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>
      {error && (
        <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded-lg border border-red-100 mb-2">{error}</p>
      )}
      <div className="flex gap-2">
        <button type="button" onClick={onCancel}
          className="flex-1 text-xs font-semibold border border-gray-300 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors">
          Cancel
        </button>
        <button type="button" onClick={onSubmit} disabled={loading || !diNo.trim() || !batchNo.trim()}
          className={`flex-1 text-xs font-bold ${BTN[theme]} disabled:opacity-40 text-white px-3 py-1.5 rounded-lg transition-colors`}>
          {loading ? 'Raising...' : 'Submit Indent'}
        </button>
      </div>
    </div>
  )
}
