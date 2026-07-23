import {
  CircleCheckBig, FlaskConical, Layers, GitBranch, Wrench, Building, Microscope, Printer,
  ArrowDownToLine, ArrowUpFromLine, Repeat2, Ban, CircleX, TriangleAlert, Info,
} from 'lucide-react'
import ResultCard from '../result-card/ResultCard.jsx'

// Categories map 1:1 to the keys executeImport() actually returns — this is
// real per-write-path data, not a pre-import validation report. warningKeys
// are the specific counters that backend attributes to that import path
// (all of Recipe/BOM's row-level issues surface under recipeBom, per the
// controller's own comments).
const CATEGORIES = [
  { key: 'supplierMaster',  label: 'Supplier Master',  icon: Building },
  { key: 'microbeMaster',   label: 'Microbe Master',   icon: Microscope },
  { key: 'productMaster',   label: 'Product Master',   icon: FlaskConical },
  { key: 'equipmentMaster', label: 'Equipment Master', icon: Wrench },
  { key: 'rmMaster',        label: 'RM Master',        icon: Layers },
  { key: 'recipeBom',       label: 'Recipe / BOM',     icon: GitBranch, warningKeys: ['unmatchedRm', 'missingQtyOrUom', 'duplicateRecipeLineExtraRows', 'skippedMissingProductOrRm'] },
  { key: 'printMaster',     label: 'Print Master',     icon: Printer },
  { key: 'inward',          label: 'Inward',           icon: ArrowDownToLine },
  { key: 'outward',         label: 'Outward',          icon: ArrowUpFromLine },
]

export default function ResultSummary({ result }) {
  const totalImported = CATEGORIES.reduce((sum, c) => sum + (result[c.key] || 0), 0)
  const totalWarnings = (result.errors?.length || 0)

  return (
    <div className="rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <CircleCheckBig size={18} className="text-green-500" />
        <h2 className="font-bold text-gray-900 text-sm">Import Complete</h2>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-5">
        <ResultCard icon={CircleCheckBig} label="Records Imported" value={totalImported} color="text-green-700" />
        <ResultCard icon={Info}           label="Row Warnings"     value={totalWarnings} color={totalWarnings ? 'text-amber-700' : 'text-gray-400'} />
        <ResultCard icon={Layers}         label="Categories Found" value={CATEGORIES.filter(c => result[c.key] > 0).length} color="text-blue-700" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100 mb-5">
        <table className="text-xs w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Category</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Imported</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Notes</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.filter(c => result[c.key] > 0 || (c.warningKeys || []).some(k => result[k] > 0)).map(c => {
              const warnings = (c.warningKeys || []).reduce((sum, k) => sum + (result[k] || 0), 0)
              return (
                <tr key={c.key} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800 flex items-center gap-1.5">
                    <c.icon size={13} className="text-gray-400" />{c.label}
                  </td>
                  <td className="px-3 py-2 text-gray-500">{result[c.key] || 0}</td>
                  <td className="px-3 py-2 text-gray-500">{warnings > 0 ? `${warnings} row(s) flagged` : '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${
                      warnings > 0 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-green-50 text-green-700 ring-green-200'
                    }`}>
                      {warnings > 0 ? 'Needs Attention' : 'Ready'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {result.duplicateRecipeLines?.length > 0 && (
        <div className="mb-3 bg-fuchsia-50 ring-1 ring-inset ring-fuchsia-100 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <Repeat2 size={15} className="text-fuchsia-500 shrink-0 mt-0.5" />
            <p className="text-fuchsia-800 text-xs font-medium leading-relaxed">
              {result.duplicateRecipeLines.length} product+ingredient combo(s) appeared more than once in the sheet
              ({result.duplicateRecipeLineExtraRows} extra row{result.duplicateRecipeLineExtraRows !== 1 ? 's' : ''} total) —
              recipe_db can only store one qty per product+ingredient, so only the <strong>last</strong> occurrence's qty/uom was kept for each:
            </p>
          </div>
          <div className="max-h-40 overflow-y-auto mt-2 ml-6 space-y-0.5">
            {result.duplicateRecipeLines.map((d, i) => (
              <p key={i} className="text-fuchsia-700 text-xs">"{d.rmName}" in "{d.productName}" — appeared {d.occurrences}× in the sheet</p>
            ))}
          </div>
          <p className="text-fuchsia-700 text-xs mt-2 ml-6">
            If these should really be separate lines (e.g. two additions of the same ingredient), sum them into one row in the source file before re-importing — the database can't hold two quantities for the same product+ingredient pair.
          </p>
        </div>
      )}

      {result.skippedMissingProductOrRm > 0 && (
        <div className="mb-3 bg-gray-50 ring-1 ring-inset ring-gray-100 rounded-xl p-4 flex items-start gap-2">
          <Ban size={15} className="text-gray-400 shrink-0 mt-0.5" />
          <p className="text-gray-700 text-xs font-medium leading-relaxed">
            {result.skippedMissingProductOrRm} row(s) were skipped entirely — blank Product Name and/or Raw Material. See the row-level warnings below for which ones.
          </p>
        </div>
      )}

      {result.unmatchedRm > 0 && (
        <div className="mb-3 bg-red-50 ring-1 ring-inset ring-red-100 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <CircleX size={15} className="text-red-500 shrink-0 mt-0.5" />
            <p className="text-red-800 text-xs font-medium leading-relaxed">
              {result.unmatchedRm} recipe row(s) had no exact name match in Raw Material Master — imported anyway, unchanged name, with item code "NaN" (or "NaN-2", "NaN-3"… per product) instead of being skipped:
            </p>
          </div>
          <p className="text-red-700 text-xs mt-1.5 ml-6">
            Add the missing RM(s) to RM Master with this exact name, then use <strong>Recipe DB → Fix RM Mapping</strong> to reconcile these "NaN" codes to the real item.
          </p>
        </div>
      )}

      {result.missingQtyOrUom > 0 && (
        <div className="mb-3 bg-amber-50 ring-1 ring-inset ring-amber-100 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <TriangleAlert size={15} className="text-amber-500 shrink-0 mt-0.5" />
            <p className="text-amber-800 text-xs font-medium leading-relaxed">
              {result.missingQtyOrUom} recipe row(s) had a blank or non-numeric Qty Per Unit and/or blank UOM — imported anyway instead of being skipped, with qty set to 0 and/or uom set to "NaN":
            </p>
          </div>
          <p className="text-amber-700 text-xs mt-1.5 ml-6">
            Open <strong>Recipe DB</strong> for the affected product(s) and fill in the correct qty/uom for any ingredient showing 0 or "NaN".
          </p>
        </div>
      )}

      {result.errors?.length > 0 && (
        <div className="bg-yellow-50 ring-1 ring-inset ring-yellow-100 rounded-xl p-4">
          <div className="flex items-start gap-2 mb-1">
            <Info size={15} className="text-yellow-600 shrink-0 mt-0.5" />
            <p className="text-yellow-800 text-sm font-medium">{result.errors.length} row-level warning(s)</p>
          </div>
          <div className="ml-6 space-y-0.5">
            {result.errors.slice(0, 8).map((e, i) => <p key={i} className="text-yellow-700 text-xs">{e}</p>)}
            {result.errors.length > 8 && <p className="text-yellow-600 text-xs mt-1">…and {result.errors.length - 8} more</p>}
          </div>
        </div>
      )}
    </div>
  )
}
