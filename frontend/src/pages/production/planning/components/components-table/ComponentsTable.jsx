import { useMemo } from 'react'
import { Lock } from 'lucide-react'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { toCanonical } from '../../../../../utils/uom.js'
import { formatMeasurement } from '../../../../../utils/measurement/formatMeasurement.js'

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

export function emptyRow(sno) {
  return { sno: String(sno), comp: '', qty: '', uom: '', rem: '', cfu: '', rmCode: '', code: '' }
}

export function makeRows(n) {
  return Array.from({ length: n }, (_, i) => emptyRow(i + 1))
}

// Reads the table into the {component,isHeader,...} shape the print templates
// and the issue flow expect. rmCode carries through from the loaded recipe so
// Material Issue by BOM knows exactly which master item each line is.
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

// Used when a recipe is loaded/scaled into the table.
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

const KIND_STYLE = {
  rm:      { code: 'text-emerald-700', pill: 'bg-gray-100 text-gray-600',       label: 'Raw Material' },
  product: { code: 'text-blue-700',    pill: 'bg-blue-100 text-blue-700',       label: 'SFG' },
  microbe: { code: 'text-purple-700',  pill: 'bg-emerald-100 text-emerald-700', label: 'Microbe / CFU' },
}
const ROLE_LABEL = { INGREDIENT: 'Ingredient', CARRIER: 'Carrier', BASE: 'Base', MICROBE: 'Microbe / CFU' }

// Read-only BOM component list for the Issue BOM screen. Every line here
// comes straight from the product's selected recipe (Recipe page) and is
// scaled to the batch size — it cannot be added to, edited, renamed or
// deleted here. Change the recipe itself in the Recipe page.
export default function ComponentsTable({ rows, rmList = [], products = [], microbes = [], stockByCode = {} }) {
  const rmCodes      = useMemo(() => new Set(rmList.map(r => (r.itemCode || '').toLowerCase())), [rmList])
  const productCodes = useMemo(() => new Set(products.map(p => (p.productCode || '').toLowerCase())), [products])
  const microbeCodes = useMemo(() => new Set(microbes.map(m => (m.microbeCode || '').toLowerCase())), [microbes])

  const kindOf = (row) => {
    const code = (row.rmCode || '').toLowerCase()
    if ((row.rem || '').trim().toUpperCase() === 'MICROBE' || microbeCodes.has(code)) return 'microbe'
    if (productCodes.has(code)) return 'product'
    return 'rm'
  }

  // Presence check only (balance > 0), not "enough for this batch" — RM,
  // SFG and microbe balances come from three different sources/units
  // (stockByCode is built by BomIssuance.jsx from all three), so a precise
  // required-vs-available comparison isn't reliable here; whether *any*
  // stock exists is still the signal that actually matters before issuing.
  const availabilityOf = (row) => {
    if (!row.rmCode) return null // "NAN" rows have nothing to look up
    const balance = stockByCode[row.rmCode.toLowerCase()]
    if (balance == null) return null // no stock record for this code at all
    return balance > 0.0009
  }

  const items = (rows || []).filter(r => (r.comp || '').trim() && !(r.comp || '').trim().startsWith('##'))

  // Batch totals per canonical unit — mirrors the Recipe page's BOM footer.
  const totals = useMemo(() => {
    const acc = {}
    for (const r of items) {
      const q = parseFloat(r.qty)
      if (!q || !isFinite(q)) continue
      try {
        const { qty, uom } = toCanonical(q, r.uom)
        acc[uom] = (acc[uom] || 0) + qty
      } catch { /* unrecognized unit — left out of the total */ }
    }
    return acc
  }, [items])

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 border-b border-gray-200 flex-wrap">
        <span className="font-semibold text-[13px] text-gray-700">🧪 BOM Components</span>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
          <Lock size={11} /> from recipe · read-only
        </span>
        <span className="ml-auto text-[12px] text-gray-400">
          {items.length} item{items.length !== 1 ? 's' : ''}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-10 text-center text-[13px] text-gray-400">
          Select a product with a stored recipe to load its components.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
                <th className="w-12 px-3 py-2 text-left font-semibold">#</th>
                <th className="px-3 py-2 text-left font-semibold">Component</th>
                <th className="w-32 px-3 py-2 text-left font-semibold">Item Code</th>
                <th className="w-28 px-3 py-2 text-right font-semibold">Qty</th>
                <th className="w-20 px-3 py-2 text-left font-semibold">UOM</th>
                <th className="w-28 px-3 py-2 text-right font-semibold">CFU/g</th>
                <th className="w-36 px-3 py-2 text-left font-semibold">Role</th>
                <th className="w-32 px-3 py-2 text-left font-semibold">Availability</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => {
                const kind = kindOf(r)
                const st = KIND_STYLE[kind]
                const cfu = fmtCfu(r.cfu)
                const availability = availabilityOf(r)
                const roleLabel = kind === 'microbe'
                  ? 'Microbe / CFU'
                  : kind === 'product'
                    ? 'SFG'
                    : (ROLE_LABEL[(r.rem || '').trim().toUpperCase()] || 'Ingredient')
                return (
                  <tr key={idx} className={`border-t border-gray-100 ${
                    kind === 'microbe' ? 'bg-emerald-50/40' : kind === 'product' ? 'bg-blue-50/40' : idx % 2 ? 'bg-gray-50/40' : ''
                  }`}>
                    <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                    <td className="px-3 py-2 text-gray-800">{toTitleCase(r.comp)}</td>
                    <td className={`px-3 py-2 font-mono text-[12px] ${r.rmCode ? st.code : 'text-red-600 font-bold'}`}>
                      {r.rmCode || 'NAN'}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-gray-900 tabular-nums">{r.qty || '—'}</td>
                    <td className="px-3 py-2 text-gray-500">{(r.uom || '').toUpperCase()}</td>
                    <td className="px-3 py-2 text-right font-medium text-purple-700 tabular-nums">
                      {cfu || <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${st.pill}`}>{roleLabel}</span>
                    </td>
                    <td className="px-3 py-2">
                      {availability == null ? (
                        <span className="text-[11px] text-gray-300">—</span>
                      ) : (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                          availability ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {availability ? 'In Stock' : 'Out of Stock'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            {Object.keys(totals).length > 0 && (
              <tfoot>
                <tr className="bg-amber-50 border-t-2 border-amber-200">
                  <td colSpan={3} className="px-3 py-2 text-[11px] font-bold text-amber-800 uppercase tracking-wide">
                    Total for this batch
                  </td>
                  <td colSpan={5} className="px-3 py-2 text-right font-bold text-amber-900">
                    {Object.entries(totals).map(([uom, qty]) => {
                      const f = formatMeasurement(qty, uom, { precision: 6 })
                      return <div key={uom}>{f.value} <span className="text-xs text-amber-700">{f.unit}</span></div>
                    })}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400">
        Components come from the product's recipe and are scaled to the batch size. To add, remove or rename an
        ingredient, edit the recipe on the <span className="font-semibold text-gray-500">Recipe</span> page.
      </div>
    </div>
  )
}
