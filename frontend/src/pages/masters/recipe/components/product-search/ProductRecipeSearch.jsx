import { useMemo, useRef, useState, useEffect } from 'react'
import { Search, X } from 'lucide-react'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

// Search-first product picker for the Recipe page — replaces the old
// always-on left sidebar. Type to filter, click a product to open its
// recipe editor. Two sizes: 'lg' for the empty-state landing, 'sm' for the
// compact "switch product" control in the page header.
export default function ProductRecipeSearch({
  productList = [], loading = false, onSelect, size = 'lg', placeholder = 'Search product by name or code…', autoFocus = false,
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(0)
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  useEffect(() => {
    const onDocClick = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? productList.filter(p =>
          p.productName?.toLowerCase().includes(q) || p.productCode?.toLowerCase().includes(q))
      : productList
    return [...list]
      .sort((a, b) => (a.productName || '').localeCompare(b.productName || ''))
      .slice(0, 50)
  }, [productList, query])

  useEffect(() => { setActiveIdx(0) }, [query])

  const choose = (p) => {
    if (!p) return
    onSelect(p)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); choose(results[activeIdx]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  const lg = size === 'lg'

  return (
    <div ref={wrapRef} className={`relative ${lg ? 'w-full max-w-xl' : 'w-full sm:w-80'}`}>
      <div className="relative">
        <Search
          size={lg ? 18 : 15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          className={`w-full border border-gray-300 bg-white text-gray-900 rounded-xl outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 ${
            lg ? 'pl-10 pr-9 py-3 text-[15px]' : 'pl-9 pr-8 py-2 text-sm'
          }`}
        />
        {query && (
          <button
            type="button"
            onClick={() => { setQuery(''); inputRef.current?.focus() }}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={lg ? 16 : 14} />
          </button>
        )}
      </div>

      {open && (
        <div className={`absolute z-40 left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden ${lg ? 'max-h-[420px]' : 'max-h-[360px]'} flex flex-col`}>
          <div className="overflow-y-auto">
            {loading ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">Loading products…</p>
            ) : results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">
                No product matches “{query}”. Add it in Product Master first.
              </p>
            ) : (
              results.map((p, i) => (
                <button
                  key={p.productCode}
                  type="button"
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(p)}
                  className={`w-full text-left px-4 py-2.5 border-b border-gray-50 last:border-0 flex items-center gap-3 transition-colors ${
                    i === activeIdx ? 'bg-indigo-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-gray-900 truncate">{toTitleCase(p.productName)}</div>
                    <div className="text-[11px] font-mono text-gray-400 truncate">
                      {p.productCode}
                      {Array.isArray(p.plant) && p.plant.length > 0 && (
                        <span className="font-sans"> · {p.plant.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  {p.totalRecipe > 0 && (
                    <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      p.totalRecipe > 1 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.totalRecipe} {p.totalRecipe > 1 ? 'recipes' : 'recipe'}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
          {!loading && results.length > 0 && (
            <div className="px-4 py-1.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-400 shrink-0">
              {query ? `${results.length} match${results.length !== 1 ? 'es' : ''}` : `${productList.length} products`}
              {' · ↑↓ to navigate · Enter to open'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
