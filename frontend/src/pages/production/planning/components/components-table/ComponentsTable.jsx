import { useMemo, useState } from 'react'
import { Link2, Plus, X } from 'lucide-react'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

const UOM_OPTIONS = ['kg', 'L', 'g', 'mg', 'mL', 'pcs', 'nos', 'bags', 'drums', '%w/w', '%v/v', 'MT']

// CFU/g shown as "2.00×10¹¹". Accepts "2e11", "200000000000", 2e11, etc.
const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' }
export function fmtCfu(v) {
  const n = Number(v)
  if (v === '' || v == null || !isFinite(n) || n <= 0) return ''
  const exp = Math.floor(Math.log10(n))
  const mant = n / 10 ** exp
  const sup = String(exp).split('').map((c) => SUP[c] ?? c).join('')
  return `${mant.toFixed(2)}×10${sup}`
}
// `cfu` is kept last so an Excel paste of the historic 5-column block
// (sno·comp·qty·uom·rem) still maps to the same fields.
const COLS = ['sno', 'comp', 'qty', 'uom', 'rem', 'cfu']

export function emptyRow(sno) {
  return { sno: String(sno), comp: '', qty: '', uom: '', rem: '', cfu: '', rmCode: '' }
}

export function makeRows(n) {
  return Array.from({ length: n }, (_, i) => emptyRow(i + 1))
}

// Mirrors the legacy getComponents() — reads the table into the {component,isHeader,...}
// shape the print templates expect. rmCode carries through so a later reload of this
// same BOM (or a "save corrections" pass) still knows which RM Master item each row
// was originally loaded from.
export function toComponents(rows) {
  let sno = 0
  const out = []
  for (const r of rows) {
    const comp = (r.comp || '').trim()
    if (!comp) continue
    const isHeader = comp.startsWith('##')
    if (!isHeader) sno++
    out.push({
      sno:       isHeader ? '' : (r.sno?.trim() || String(sno)),
      component: isHeader ? comp.replace(/^##\s*/, '').trim() : comp,
      qty:       isHeader ? '' : (r.qty || '').trim(),
      uom:       isHeader ? '' : (r.uom || ''),
      cfu:       isHeader ? '' : (r.cfu || '').trim(),
      remarks:   isHeader ? '' : (r.rem || '').trim(),
      rmCode:    isHeader ? '' : (r.rmCode || ''),
      isHeader,
    })
  }
  return out
}

// Mirrors setComponents() — used when a recipe is loaded/scaled into the table.
export function fromComponents(comps, minRows) {
  const rows = makeRows(Math.max(minRows, comps.length))
  comps.forEach((c, i) => {
    rows[i] = {
      sno: c.sno || String(i + 1),
      comp: c.isHeader ? `## ${c.component || ''}` : (c.component || ''),
      qty: c.qty || '',
      uom: c.uom || '',
      cfu: c.cfu || '',
      rem: c.remarks || '',
      rmCode: c.rmCode || '',
    }
  })
  return rows
}

export default function ComponentsTable({ rows, onChange, rmList = [], products = [], microbes = [], onSaveCorrections, savingCorrections }) {
  const [suggestIdx, setSuggestIdx] = useState(null)
  const [editingCfu, setEditingCfu] = useState(null)

  const rmByNameLower = useMemo(() => {
    const map = new Map()
    rmList.forEach(rm => map.set((rm.itemName || '').trim().toLowerCase(), rm))
    return map
  }, [rmList])

  // A recipe component isn't always a raw material — it can be an SFG
  // (semi-finished good), which lives in Product Master with a product
  // code instead of an RM item code. Only fall back to "NAN" once a name
  // matches neither list.
  const productByNameLower = useMemo(() => {
    const map = new Map()
    products.forEach(p => map.set((p.productName || '').trim().toLowerCase(), p))
    return map
  }, [products])

  // ...or a microbial culture, which lives in Microbe Master with an
  // mc00001-style code instead of an RM item code — previously not checked
  // at all here, so every microbe ingredient showed as an unmatched "NAN".
  const microbeByNameLower = useMemo(() => {
    const map = new Map()
    microbes.forEach(m => map.set((m.microbeName || '').trim().toLowerCase(), m))
    return map
  }, [microbes])

  // Returns { code, kind: 'rm' | 'product' | 'microbe' } | undefined
  // Microbe Master is checked FIRST, ahead of RM Master: every one of the 69
  // real microbes also exists as a legacy RM Master row under the same name
  // (added there before Microbe Master existed as its own thing, e.g.
  // "Saccharomyces cerevisiae" = RM "SC" AND Microbe "mc00059"). A name that
  // matches both must always resolve to the real mc00001-style code, never
  // the stale RM one — Store doesn't issue microbes, so a component ending
  // up on the RM side is a silent misroute, not a cosmetic label choice.
  const matchFor = (name) => {
    const key = (name || '').trim().toLowerCase()
    const microbe = microbeByNameLower.get(key)
    if (microbe) return { code: microbe.microbeCode, kind: 'microbe', item: microbe }
    const rm = rmByNameLower.get(key)
    if (rm) return { code: rm.itemCode, kind: 'rm', item: rm }
    const product = productByNameLower.get(key)
    if (product) return { code: product.productCode, kind: 'product', item: product }
    return undefined
  }

  const suggestionsFor = (text) => {
    const q = (text || '').trim().toLowerCase()
    if (!q) return []
    // RM hits that duplicate a Microbe Master name are dropped — only the
    // real mc00... code should ever be offered for a microbe, never the
    // legacy RM stand-in (see matchFor above).
    const rmHits = rmList.filter(rm => (rm.itemName || '').toLowerCase().includes(q) && !microbeByNameLower.has((rm.itemName || '').trim().toLowerCase()))
      .map(rm => ({ kind: 'rm', code: rm.itemCode, name: rm.itemName, uom: rm.inventoryUom }))
    const microbeHits = microbes.filter(m => (m.microbeName || '').toLowerCase().includes(q))
      .map(m => ({ kind: 'microbe', code: m.microbeCode, name: m.microbeName, uom: m.uom }))
    const productHits = products.filter(p => (p.productName || '').toLowerCase().includes(q))
      .map(p => ({ kind: 'product', code: p.productCode, name: p.productName }))
    return [...rmHits, ...microbeHits, ...productHits].slice(0, 8)
  }

  // Rows whose typed name now resolves to a *different* code than the one
  // this row was originally loaded from (recipe_db) — real, save-able
  // corrections. Manually typed rows (no rmCode, never came from a saved
  // recipe) have nothing to reconcile against, so they're excluded here even
  // if unmatched. The match can be an RM Master item or a Product Master
  // item (an SFG used as an ingredient) — either kind is save-able, tagged
  // so the backend knows which master table to resolve it against.
  const corrections = useMemo(() => {
    const seen = new Map()
    for (const r of rows) {
      if (!r.rmCode || (r.comp || '').trim().startsWith('##')) continue
      const matched = matchFor(r.comp)
      if (matched && matched.code !== r.rmCode) {
        seen.set(r.rmCode, { fromCode: r.rmCode, toCode: matched.code, kind: matched.kind })
      }
    }
    return [...seen.values()]
  }, [rows, rmByNameLower, productByNameLower, microbeByNameLower])

  const addRow = () => onChange([...rows, emptyRow(rows.length + 1)])

  // Renumbers the visible S.No on non-header rows after a delete so the
  // column stays 1..N (toComponents recomputes the real numbering anyway).
  const removeRow = (idx) => {
    let s = 0
    const next = rows.filter((_, i) => i !== idx).map((r) => {
      const isH = (r.comp || '').trim().startsWith('##')
      if (!isH) s += 1
      return { ...r, sno: isH ? '' : String(s) }
    })
    onChange(next.length ? next : [emptyRow(1)])
  }

  const updateCell = (idx, key, value) => {
    const next = rows.slice()
    next[idx] = { ...next[idx], [key]: value }
    onChange(next)
  }

  const pickSuggestion = (idx, suggestion) => {
    updateCell(idx, 'comp', toTitleCase(suggestion.name))
    setSuggestIdx(null)
  }

  // Multi-row/column paste from Excel — fills down from the pasted cell,
  // extending the table with new rows if the pasted block runs past the end.
  const handleCellPaste = (e, rowIdx, colKey) => {
    const text = e.clipboardData.getData('text')
    const lines = text.replace(/\r/g, '').split('\n').filter((_, i, arr) => !(i === arr.length - 1 && arr[i] === ''))
    if (lines.length <= 1 && !text.includes('\t')) return // single cell — let the browser handle it
    e.preventDefault()
    const startCol = COLS.indexOf(colKey)
    const next = rows.slice()
    lines.forEach((line, li) => {
      const targetIdx = rowIdx + li
      while (next.length <= targetIdx) next.push(emptyRow(next.length + 1))
      const cells = line.split('\t')
      cells.forEach((cell, ci) => {
        const col = COLS[startCol + ci]
        if (!col) return
        next[targetIdx] = { ...next[targetIdx], [col]: cell.trim() }
      })
    })
    onChange(next)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        <span className="font-semibold text-[13px] text-gray-700">🧪 BOM Components</span>
        <div className="ml-auto flex items-center gap-2.5 text-[12px]">
          <span className="text-gray-400">{rows.length} row{rows.length !== 1 ? 's' : ''} · paste from Excel directly</span>
          <button type="button" onClick={addRow}
            className="inline-flex items-center gap-1 px-2.5 py-1 border border-gray-300 rounded-md hover:bg-gray-100 font-medium text-gray-700">
            <Plus size={12} /> Add Row
          </button>
        </div>
      </div>

      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-[12px] text-blue-800">
        💡 <b>Section headers:</b> start any Component name with <code className="bg-white/60 px-1 rounded">##</code> to
        insert a section divider (e.g. <code className="bg-white/60 px-1 rounded">## NITROBACTER SP BROTH — Preparation</code>).
        Leave qty/uom blank for that row.
      </div>

      {corrections.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-3 flex-wrap text-[12px]">
          <span className="text-amber-800">
            ⚠ <b>{corrections.length}</b> corrected name{corrections.length !== 1 ? 's' : ''} ready to save back to Recipe Master
            {corrections.some(c => c.kind === 'product') && (
              <span className="ml-1 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 align-middle">includes SFG</span>
            )}
            {corrections.some(c => c.kind === 'microbe') && (
              <span className="ml-1 text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 py-0.5 align-middle">includes MICROBE</span>
            )}.
            This updates the mapping for <b>every product</b> that uses the old code, not just this batch.
          </span>
          <button type="button" onClick={() => onSaveCorrections?.(corrections)} disabled={savingCorrections}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-semibold whitespace-nowrap">
            <Link2 size={13} />
            {savingCorrections ? 'Saving…' : `Save ${corrections.length} Correction${corrections.length !== 1 ? 's' : ''} to Recipe`}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead>
            <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
              <th className="w-14 px-2 py-2 text-left font-semibold">S.No</th>
              <th className="px-2 py-2 text-left font-semibold">Component / Raw Material</th>
              <th className="w-28 px-2 py-2 text-left font-semibold">Item Code</th>
              <th className="w-24 px-2 py-2 text-left font-semibold">Quantity</th>
              <th className="w-24 px-2 py-2 text-left font-semibold">UOM</th>
              <th className="w-28 px-2 py-2 text-left font-semibold">CFU/g</th>
              <th className="w-36 px-2 py-2 text-left font-semibold">Remarks</th>
              <th className="w-8 px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, idx) => {
              const isHeader = (r.comp || '').trim().startsWith('##')
              const matched  = !isHeader ? matchFor(r.comp) : null
              const hasText  = !!(r.comp || '').trim()
              const suggestions = suggestIdx === idx ? suggestionsFor(r.comp) : []
              // CFU/g only means something for a microbial component — a real
              // Microbe Master match, a row the recipe tagged MICROBE, or one
              // that already carries a value.
              const isMicrobeRow = matched?.kind === 'microbe'
                || (r.rem || '').trim().toUpperCase() === 'MICROBE'
                || !!(r.cfu || '').trim()
              return (
                <tr key={idx} className={`border-t border-gray-100 ${isHeader ? 'bg-amber-50/50' : idx % 2 ? 'bg-gray-50/40' : ''}`}>
                  <td className="p-0"><input value={r.sno} onChange={e => updateCell(idx, 'sno', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'sno')}
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50" /></td>
                  <td className="p-0 relative">
                    <input value={r.comp}
                      onChange={e => { updateCell(idx, 'comp', e.target.value); setSuggestIdx(idx) }}
                      onFocus={() => setSuggestIdx(idx)}
                      onBlur={() => setTimeout(() => setSuggestIdx(s => (s === idx ? null : s)), 150)}
                      onPaste={e => handleCellPaste(e, idx, 'comp')}
                      autoComplete="off"
                      className={`w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 ${isHeader ? 'font-bold text-amber-800' : ''}`} />
                    {suggestions.length > 0 && (
                      <div className="absolute z-30 left-0 right-0 top-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
                        {suggestions.map(s => (
                          <button key={`${s.kind}-${s.code}`} type="button" onMouseDown={() => pickSuggestion(idx, s)}
                            className="w-full text-left px-3 py-1.5 text-[12px] hover:bg-indigo-50 border-b border-gray-50 last:border-0 flex items-center justify-between gap-2">
                            <span className="font-medium text-gray-800 truncate">{toTitleCase(s.name)}</span>
                            <span className="flex items-center gap-1.5 flex-shrink-0">
                              {s.kind === 'product' && (
                                <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5">SFG</span>
                              )}
                              {s.kind === 'microbe' && (
                                <span className="text-[9px] font-bold text-purple-600 bg-purple-50 border border-purple-200 rounded px-1 py-0.5">MICROBE</span>
                              )}
                              <span className="font-mono text-[10px] text-gray-400">{s.code}</span>
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="p-0 px-2">
                    {isHeader || !hasText ? null : matched ? (
                      matched.kind === 'product' ? (
                        <span className="font-mono text-[12px] text-blue-700" title="Matched a Product Master item (SFG) — this is a product code, not a raw material code">{matched.code}</span>
                      ) : matched.kind === 'microbe' ? (
                        <span className="font-mono text-[12px] text-purple-700" title="Matched a Microbe Master item — this is a microbe code, and Store won't issue it. It routes to Microbe Outward instead.">{matched.code}</span>
                      ) : (
                        <span className="font-mono text-[12px] text-emerald-700" title="Matched a Raw Material Master item">{matched.code}</span>
                      )
                    ) : (
                      <span className="font-mono text-[12px] font-bold text-red-600" title="This name doesn't match any Raw Material Master, Product Master, or Microbe Master item">NAN</span>
                    )}
                  </td>
                  <td className="p-0"><input value={r.qty} onChange={e => updateCell(idx, 'qty', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'qty')} disabled={isHeader}
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 disabled:bg-gray-50" /></td>
                  <td className="p-0"><input value={r.uom} onChange={e => updateCell(idx, 'uom', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'uom')} disabled={isHeader} list="bom-uom-list"
                    placeholder="kg/L/g…"
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 disabled:bg-gray-50" /></td>
                  <td className="p-0">
                    {isHeader ? (
                      <input disabled className="w-full px-2 py-1.5 bg-gray-50" />
                    ) : editingCfu === idx ? (
                      <input autoFocus value={r.cfu}
                        onChange={e => updateCell(idx, 'cfu', e.target.value)}
                        onPaste={e => handleCellPaste(e, idx, 'cfu')}
                        onBlur={() => setEditingCfu(null)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingCfu(null) }}
                        placeholder="e.g. 2e9 or 200000000000"
                        className="w-full px-2 py-1.5 outline-none bg-indigo-50" />
                    ) : (
                      <button type="button" onClick={() => setEditingCfu(idx)}
                        title="CFU/g — click to edit (applies to microbial components)"
                        className={`w-full text-left px-2 py-1.5 hover:bg-indigo-50 ${isMicrobeRow ? 'text-purple-700 font-medium' : 'text-gray-300'}`}>
                        {r.cfu ? fmtCfu(r.cfu) : (isMicrobeRow ? 'e.g. 2e9' : '—')}
                      </button>
                    )}
                  </td>
                  <td className="p-0"><input value={r.rem} onChange={e => updateCell(idx, 'rem', e.target.value)}
                    onPaste={e => handleCellPaste(e, idx, 'rem')} disabled={isHeader}
                    className="w-full px-2 py-1.5 outline-none bg-transparent focus:bg-indigo-50 disabled:bg-gray-50" /></td>
                  <td className="p-0 text-center">
                    <button type="button" onClick={() => removeRow(idx)} tabIndex={-1}
                      title="Remove this row"
                      className="text-gray-300 hover:text-red-500 transition p-1">
                      <X size={13} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <datalist id="bom-uom-list">
        {UOM_OPTIONS.map(u => <option key={u} value={u} />)}
      </datalist>
    </div>
  )
}
