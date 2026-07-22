import { Calculator, RefreshCw, Trash2, X } from 'lucide-react'
import { Button } from '../../../../../components/ui'
import { fmtCfu, fmtDate } from '../../utils/format.js'

export default function RequirementRow({ index, row, microbes, canRemove, onChange, onCalculate, onRemove, onAllocationQtyChange, onAllocationRemove, onAllocationChange, calculating }) {
  const handleMicrobeChange = (e) => {
    const m = microbes.find((x) => x.microbeId === e.target.value)
    onChange({ microbe_id: m?.microbeId || '', microbe_code: m?.microbeCode || '', microbe_name: m?.microbeName || '', calc: null })
  }

  const pickedTotal = row.calc ? row.calc.allocations.reduce((s, a) => s + Number(a.qty_issued_kg), 0) : 0
  const shortKg = row.required_qty_kg ? Math.max(0, Number(row.required_qty_kg) - pickedTotal) : 0
  const canCalc = row.microbe_code && Number(row.required_qty_kg) > 0 && Number(row.required_cfu_per_g) > 0

  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white">
      <div className="flex items-start gap-3">
        <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-1">{index + 1}</div>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Microbe *</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={row.microbe_id} onChange={handleMicrobeChange}>
              <option value="">— Select microbe —</option>
              {microbes.map((m) => <option key={m.microbeId} value={m.microbeId}>{m.microbeName} ({m.microbeCode})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Required Qty (kg) *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" min="0.001" step="0.001" placeholder="e.g. 20" value={row.required_qty_kg} onChange={(e) => onChange({ required_qty_kg: e.target.value, calc: null })} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Required CFU/g *</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500" type="number" min="0" step="any" placeholder="e.g. 5e10" value={row.required_cfu_per_g} onChange={(e) => onChange({ required_cfu_per_g: e.target.value, calc: null })} />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" icon={Calculator} size="sm" disabled={!canCalc || calculating} loading={calculating} onClick={onCalculate}>
              Calculate FEFO
            </Button>
            {canRemove && (
              <button type="button" onClick={onRemove} className="p-2 text-red-500 hover:bg-red-50 rounded-lg" title="Remove requirement">
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {row.calc && (
        <div className="mt-3 ml-9 bg-blue-50/60 border border-blue-100 rounded-lg p-3">
          <div className="text-xs font-semibold text-blue-900 mb-2">
            Total CFU required: <strong>{fmtCfu(row.calc.total_cfu_needed)}</strong>
            {' '}({row.required_qty_kg}kg × {fmtCfu(Number(row.required_cfu_per_g))} CFU/g) &nbsp;|&nbsp;
            {row.calc.allocations.length === 0 ? (
              <span className="text-red-600 font-bold">No stock available for this microbe</span>
            ) : shortKg <= 0.0009 ? (
              <span className="text-green-700 font-bold">✓ Fully covered by {row.calc.allocations.length} batch(es)</span>
            ) : (
              <span className="text-red-600 font-bold">⚠ Short by ~{shortKg.toFixed(3)} kg</span>
            )}
          </div>

          <div className="space-y-2">
            {row.calc.allocations.map((a) => (
              <div key={a.inward_id} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-3 items-center bg-white border border-gray-200 rounded-lg px-3 py-2.5">
                <div className="text-xs">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-gray-700">{a.container_code}</span>
                    <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">{a.type_code}</span>
                    {a.location && <span className="text-gray-400">📍 {a.location}</span>}
                  </div>
                  <div className="text-gray-500">
                    Batch: <strong>{a.biomass_batch_code}</strong> · Harvest {fmtDate(a.date_of_harvest)} · Expiry {a.expiry_date ? fmtDate(a.expiry_date) : '—'} · Available <strong>{Number(a.available_kg).toFixed(3)} kg</strong>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] text-gray-400 mb-0.5">Issue Qty (kg)</label>
                  <input
                    className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    type="number" min="0.0001" max={a.available_kg} step="0.0001"
                    value={a.qty_issued_kg}
                    onChange={(e) => onAllocationQtyChange(a.inward_id, e.target.value)}
                  />
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => onAllocationChange(a.inward_id)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded" title="Change container">
                    <RefreshCw size={14} />
                  </button>
                  <button type="button" onClick={() => onAllocationRemove(a.inward_id)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="Remove this batch">
                    <X size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
