import { useState, useEffect, useMemo } from 'react'
import { Plus, Save, Trash2 } from 'lucide-react'
import { Button, IconButton } from '../../../../../components/ui'
import './BomEditor.css'

const ROLE_TYPE_STYLE = {
  INGREDIENT: 'bg-gray-100 text-gray-600',
  CARRIER:    'bg-purple-100 text-purple-700',
  BASE:       'bg-blue-100 text-blue-700',
  MICROBE:    'bg-emerald-100 text-emerald-700',
}

export default function BomEditor({ selectedProduct, bomRows, loadId, rmList, productList = [], saving, msg, onAddRow, onSaveAll, onUpdateRow, onSelectRm, onRemoveRow }) {
  const [rmDropIdx, setRmDropIdx] = useState(null)
  const [rmSearch, setRmSearch]   = useState({})

  // Re-initialize search values once bomRows actually holds the newly
  // fetched product's rows (loadId), not on selectedProduct.productCode —
  // that changes synchronously on click, before the async fetch resolves,
  // which used to seed this from the *previous* product's still-current
  // bomRows and leave stale item names displayed over the new codes/qty.
  useEffect(() => {
    const map = {}
    bomRows.forEach((r, i) => { map[i] = r.rmName || '' })
    setRmSearch(map)
  }, [loadId]) // eslint-disable-line react-hooks/exhaustive-deps

  const productByCode = useMemo(() => new Map(productList.map(p => [p.productCode, p])), [productList])

  // A recipe component isn't always a raw material — it can be an SFG
  // (semi-finished good) used as an ingredient, which lives in Product
  // Master with a product code instead of an RM item code. Search both.
  const filteredRm = (search) => {
    const q = (search || '').toLowerCase()
    const rmHits = rmList
      .filter(r => !q || r.itemName.toLowerCase().includes(q) || r.itemCode.toLowerCase().includes(q))
      .map(r => ({ kind: 'rm', code: r.itemCode, name: r.itemName, uom: r.uom, raw: r }))
    const productHits = productList
      .filter(p => !q || p.productName.toLowerCase().includes(q) || p.productCode.toLowerCase().includes(q))
      .map(p => ({ kind: 'product', code: p.productCode, name: p.productName, raw: p }))
    return [...rmHits, ...productHits]
  }

  const handleSelectRm = (idx, hit) => {
    setRmSearch(s => ({ ...s, [idx]: hit.name }))
    setRmDropIdx(null)
    onSelectRm(idx, hit.raw, hit.kind)
  }

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
              {selectedProduct.plant && <span className="ml-3 text-gray-400">· {selectedProduct.plant}</span>}
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
          <table className="w-full text-sm">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="text-left px-3 py-3 font-semibold w-8">#</th>
                <th className="text-left px-3 py-3 font-semibold">Item Name</th>
                <th className="text-left px-3 py-3 font-semibold w-32">Item Code</th>
                <th className="text-left px-3 py-3 font-semibold w-28">
                  Qty / 1 KG <span className="ml-1 text-amber-300 text-xs font-normal">↗ per kg</span>
                </th>
                <th className="text-left px-3 py-3 font-semibold w-20">UOM</th>
                <th className="text-left px-3 py-3 font-semibold w-28">
                  Role <span className="ml-1 text-purple-300 text-xs font-normal">🔄 carrier?</span>
                </th>
                <th className="text-left px-3 py-3 font-semibold w-14">Del</th>
              </tr>
            </thead>
            <tbody>
              {bomRows.map((row, idx) => (
                <tr key={idx} className={`border-b border-gray-100 ${
                  row.roleType === 'CARRIER' ? 'bg-purple-50' :
                  row.roleType === 'MICROBE' ? 'bg-emerald-50' :
                  row._dirty ? 'bg-yellow-50' : 'hover:bg-gray-50'
                }`}>
                  <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>

                  {/* Item name with autocomplete */}
                  <td className="px-2 py-1 relative">
                    <input
                      value={rmSearch[idx] !== undefined ? rmSearch[idx] : row.rmName}
                      onChange={e => { setRmSearch(s => ({ ...s, [idx]: e.target.value })); setRmDropIdx(idx); onUpdateRow(idx, 'rmName', e.target.value) }}
                      onFocus={() => setRmDropIdx(idx)}
                      onBlur={() => setTimeout(() => setRmDropIdx(null), 150)}
                      placeholder="Type to search item..."
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
                    />
                    {rmDropIdx === idx && filteredRm(rmSearch[idx]).length > 0 && (
                      <div className="absolute z-30 left-2 right-2 bg-white border border-gray-200 rounded-lg shadow-xl mt-0.5 max-h-44 overflow-y-auto">
                        {filteredRm(rmSearch[idx]).map(hit => (
                          <button key={`${hit.kind}-${hit.code}`} type="button"
                            onMouseDown={() => handleSelectRm(idx, hit)}
                            className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
                            <span className="font-medium">{hit.name}</span>
                            {hit.kind === 'product' && (
                              <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 ml-2 align-middle">SFG</span>
                            )}
                            <span className="text-gray-400 text-xs ml-2">{hit.code}</span>
                            {hit.uom && <span className="text-gray-300 text-xs ml-1">· {hit.uom}</span>}
                          </button>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-2 py-1">
                    <div className="relative">
                      <input value={row.rmCode} readOnly
                        className={`w-full border border-gray-100 rounded px-2 py-1.5 text-xs bg-gray-50 font-mono ${isProductCode(row.rmCode) ? 'text-blue-700 pr-9' : 'text-blue-700'}`} />
                      {isProductCode(row.rmCode) && (
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5" title="This code comes from Product Master (SFG), not RM Master">SFG</span>
                      )}
                    </div>
                  </td>
                  <td className="px-2 py-1">
                    <input type="number" step="0.001" min="0" value={row.qtyPerUnit}
                      onChange={e => onUpdateRow(idx, 'qtyPerUnit', e.target.value)}
                      placeholder="0.000"
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 text-right" />
                  </td>
                  <td className="px-2 py-1">
                    <input value={row.uom} onChange={e => onUpdateRow(idx, 'uom', e.target.value)}
                      placeholder="KG"
                      className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400" />
                  </td>
                  <td className="px-2 py-1">
                    <select value={row.roleType || 'INGREDIENT'} onChange={e => onUpdateRow(idx, 'roleType', e.target.value)}
                      className={`w-full border rounded px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-400 ${ROLE_TYPE_STYLE[row.roleType] || ROLE_TYPE_STYLE.INGREDIENT} border-current`}>
                      <option value="INGREDIENT">Ingredient</option>
                      <option value="MICROBE">Microbe / CFU</option>
                      <option value="CARRIER">Carrier 🔄</option>
                      <option value="BASE">Base</option>
                    </select>
                  </td>
                  <td className="px-2 py-1 text-center">
                    <IconButton icon={Trash2} variant="danger" tooltip="Remove row" onClick={() => onRemoveRow(idx)} />
                  </td>
                </tr>
              ))}
            </tbody>

            {bomRows.filter(r => r.rmCode && r.qtyPerUnit).length > 0 && (() => {
              const totals = {}
              bomRows.filter(r => r.rmCode && r.qtyPerUnit).forEach(r => {
                totals[r.uom] = (totals[r.uom] || 0) + parseFloat(r.qtyPerUnit || 0)
              })
              return (
                <tfoot>
                  <tr className="bg-amber-50 border-t-2 border-amber-200">
                    <td colSpan={3} className="px-3 py-2 text-xs font-bold text-amber-800 uppercase tracking-wide">
                      Total per 1 KG product
                    </td>
                    <td className="px-3 py-2 text-right font-bold text-amber-900 text-sm">
                      {Object.entries(totals).map(([uom, qty]) => (
                        <div key={uom}>{qty.toFixed(4)} <span className="text-xs text-amber-700">{uom}</span></div>
                      ))}
                    </td>
                    <td colSpan={3} />
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
    </>
  )
}
