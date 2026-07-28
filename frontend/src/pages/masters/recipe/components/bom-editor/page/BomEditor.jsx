import { useState, useEffect, useMemo } from 'react'
import { Plus, Save } from 'lucide-react'
import { Button } from '../../../../../../components/ui'
import { formatMeasurement } from '../../../../../../utils/measurement/formatMeasurement.js'
import { toCanonical } from '../../../../../../utils/uom.js'
import BomRow from '../components/BomRow.jsx'
import BomRowEditModal from '../components/BomRowEditModal.jsx'
import './BomEditor.css'

export default function BomEditor({ selectedProduct, bomRows, loadId, rmList, productList = [], saving, msg, onAddRow, onSaveAll, onUpdateRow, onSelectRm, onRemoveRow }) {
  // Only one row is ever being edited at a time, via the modal — it owns all
  // of its own search/draft state, so this just needs to know which row.
  const [editingIdx, setEditingIdx] = useState(null)

  // Close any open editor once the product's rows actually reload (loadId),
  // not selectedProduct.productCode — that changes synchronously on click,
  // before the async fetch resolves, which used to leave the modal open on
  // a row index belonging to the *previous* product.
  useEffect(() => { setEditingIdx(null) }, [loadId])

  const productByCode = useMemo(() => new Map(productList.map(p => [p.productCode, p])), [productList])

  const openEdit = (idx) => setEditingIdx(idx)
  const closeEdit = () => setEditingIdx(null)

  // Whether the (already-resolved) code sitting in a row is a Product Master
  // code, so the readonly Item Code cell can flag it as an SFG rather than
  // implying it's a raw material.
  const isProductCode = (code) => !!code && productByCode.has(code)

  if (!selectedProduct) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-5xl mb-3">📋</div>
          <p className="text-lg font-medium">Select a product to view its BOM</p>
          <p className="text-sm mt-1">Use the left panel to choose a product</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* BOM header bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">{selectedProduct.productName}</h1>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <p className="text-sm text-gray-500 font-mono">
              Code: <span className="text-blue-700 font-semibold">{selectedProduct.productCode}</span>
              {selectedProduct.plant?.length > 0 && <span className="ml-3 text-gray-400">· {selectedProduct.plant.join(', ')}</span>}
            </p>
            <span className="bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
              📐 Qty per 1 KG of product
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline-gray" icon={Plus} onClick={onAddRow} size="sm">Add Item Row</Button>
          <Button variant="primary" icon={Save} onClick={onSaveAll} disabled={saving} loading={saving} size="sm">
            {saving ? 'Saving...' : 'Save BOM'}
          </Button>
        </div>
      </div>

      {msg.text && (
        <div className={`mx-4 mt-3 px-4 py-2.5 rounded-lg text-sm ${msg.type === 'success' ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {msg.text}
        </div>
      )}

      {/* BOM table */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm table-fixed">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="text-left px-3 py-3 font-semibold w-[4%]">#</th>
                <th className="text-left px-3 py-3 font-semibold w-[34%]">Item Name</th>
                <th className="text-left px-3 py-3 font-semibold w-[16%]">Item Code</th>
                <th className="text-right px-3 py-3 font-semibold w-[14%]">Qty</th>
                <th className="text-left px-3 py-3 font-semibold w-[16%]">Role</th>
                <th className="text-center px-3 py-3 font-semibold w-[16%]">Action</th>
              </tr>
            </thead>
            <tbody>
              {bomRows.map((row, idx) => (
                <BomRow
                  key={idx}
                  row={row}
                  idx={idx}
                  isProductCode={isProductCode}
                  onEdit={openEdit}
                  onRemoveRow={onRemoveRow}
                />
              ))}
            </tbody>

            {bomRows.filter(r => r.rmCode && r.qtyPerUnit).length > 0 && (() => {
              // Grouping by the raw `uom` string ("Kg" vs "KG" vs "kg") used
              // to split one real total into several confusing lines —
              // canonicalize first so everything that's actually the same
              // unit sums into one bucket. Rows with a garbage/unrecognized
              // uom (e.g. a stray "q.s" annotation) can't be canonicalized
              // at all — they're already flagged on the row itself, so they're
              // just left out of this sum rather than silently corrupting it.
              const totals = {}
              bomRows.filter(r => r.rmCode && r.qtyPerUnit).forEach(r => {
                try {
                  const { qty, uom } = toCanonical(parseFloat(r.qtyPerUnit), r.uom)
                  totals[uom] = (totals[uom] || 0) + qty
                } catch { /* unrecognized uom on this row — excluded from the total */ }
              })
              return (
                <tfoot>
                  <tr className="bg-amber-50 border-t-2 border-amber-200">
                    <td colSpan={3} className="px-3 py-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
                      Total per 1 KG product
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-amber-900 text-sm">
                      {Object.entries(totals).map(([uom, qty]) => {
                        // The tiers' own default precision (2dp at kg/L scale)
                        // is fine for a single row, but this total is a sum of
                        // many mg/ml-scale rows — at 2dp those contributions
                        // round away entirely (1.002 L → "1 L"), so manually
                        // adding up the rows on screen never matches what's
                        // shown here. A higher explicit precision keeps this
                        // line truthful to the actual sum instead.
                        const friendly = formatMeasurement(qty, uom, { precision: 6 })
                        return <div key={uom}>{friendly.value} <span className="text-xs text-amber-700">{friendly.unit}</span></div>
                      })}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )
            })()}
          </table>

          {bomRows.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">No BOM rows yet. Click "+ Add Item Row".</div>
          )}

          <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
            <span className="text-xs text-gray-400">
              {bomRows.filter(r => r.rmCode).length} items configured · All quantities per 1 KG finished product
            </span>
            <Button variant="primary" icon={Save} onClick={onSaveAll} disabled={saving} loading={saving} size="sm">
              {saving ? 'Saving...' : 'Save BOM'}
            </Button>
          </div>
        </div>
      </div>

      <BomRowEditModal
        open={editingIdx !== null}
        onClose={closeEdit}
        row={editingIdx !== null ? bomRows[editingIdx] : null}
        idx={editingIdx}
        isProductCode={isProductCode}
        rmList={rmList}
        productList={productList}
        onUpdateRow={onUpdateRow}
        onSelectRm={onSelectRm}
      />
    </>
  )
}
