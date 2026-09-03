import { useMemo, useState } from 'react'
import { GitBranch, Clock, ChevronDown } from 'lucide-react'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import ProductRecipeSearch from './ProductRecipeSearch.jsx'

// Empty state for the Recipe page — a single search bar (no permanent
// sidebar). Recently opened products are offered as quick chips, and the
// full list is one click away for browsing.
export default function RecipeLanding({ productList = [], loading, recentCodes = [], onSelect }) {
  const [showAll, setShowAll] = useState(false)

  const byCode = useMemo(() => new Map(productList.map(p => [p.productCode, p])), [productList])
  const recent = recentCodes.map(c => byCode.get(c)).filter(Boolean).slice(0, 6)

  const allSorted = useMemo(
    () => [...productList].sort((a, b) => (a.productName || '').localeCompare(b.productName || '')),
    [productList],
  )

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-16 pb-10 text-center">
        <span className="inline-flex w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 items-center justify-center mb-4">
          <GitBranch size={24} strokeWidth={2.2} />
        </span>
        <h2 className="text-xl font-bold text-gray-900">Open a product's recipe</h2>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Search for a product and select it to view or edit its bill of materials.
        </p>

        <div className="flex justify-center">
          <ProductRecipeSearch productList={productList} loading={loading} onSelect={onSelect} size="lg" autoFocus />
        </div>

        {recent.length > 0 && (
          <div className="mt-8 text-left">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
              <Clock size={12} /> Recently opened
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map(p => (
                <button
                  key={p.productCode}
                  type="button"
                  onClick={() => onSelect(p)}
                  className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                >
                  <span className="font-medium">{toTitleCase(p.productName)}</span>
                  <span className="text-[10px] font-mono text-gray-400">{p.productCode}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAll(v => !v)}
          className="mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
        >
          <ChevronDown size={15} className={`transition-transform ${showAll ? 'rotate-180' : ''}`} />
          {showAll ? 'Hide' : 'Browse'} all products ({productList.length})
        </button>
      </div>

      {showAll && (
        <div className="max-w-5xl mx-auto px-4 pb-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {allSorted.map(p => (
              <button
                key={p.productCode}
                type="button"
                onClick={() => onSelect(p)}
                className="text-left rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-indigo-300 hover:shadow-sm transition-all"
              >
                <div className="text-sm font-semibold text-gray-900 truncate">{toTitleCase(p.productName)}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] font-mono text-gray-400">{p.productCode}</span>
                  {p.totalRecipe > 1 && (
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-700 rounded-full px-1.5 py-0.5">
                      {p.totalRecipe} recipes
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
