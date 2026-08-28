import { useEffect, useRef, useState } from 'react'

// Type-to-search packing field, same contract as the Gate Inward
// SupplierAutocomplete: suggestions filter from the Packing Item master
// (Settings > Packing Items) as you type, but the committed value (what
// onChange reports to the parent form) only ever becomes a real packing item
// name — by clicking a suggestion or typing one out exactly. Typing
// something that matches no packing item commits "" (the field stays
// effectively empty on save), even though the input still shows the typed
// text. `items` is already filtered to one type (PRIMARY or SECONDARY) by
// the caller, so a primary description can never land in the secondary field
// or vice versa.
export default function PackingAutocomplete({ value, items, onChange, placeholder }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const lastCommitted = useRef(value || '')

  // Re-sync from the parent only when it changed for a reason other than our
  // own commit (e.g. the form was reset / an existing order was loaded) —
  // otherwise committing "" while mid-typing a non-match wipes the input.
  useEffect(() => {
    if ((value || '') !== lastCommitted.current) {
      setQuery(value || '')
      lastCommitted.current = value || ''
    }
  }, [value])

  const commit = (v) => {
    lastCommitted.current = v
    onChange(v)
  }

  const q = query.trim().toLowerCase()
  const matches = q
    ? items
        .filter(p => p.name.toLowerCase().includes(q) || (p.itemCode || '').toLowerCase().includes(q))
        .slice(0, 8)
    : items.slice(0, 8)

  const handleChange = (e) => {
    const text = e.target.value
    setQuery(text)
    setOpen(true)
    const exact = items.find(p => p.name.toLowerCase() === text.trim().toLowerCase())
    commit(exact ? exact.name : '')
  }

  const pick = (name) => {
    setQuery(name)
    commit(name)
    setOpen(false)
  }

  const noMatch = open && query.trim() && matches.length === 0
  // Input shows text that won't be saved — flag it so the operator knows.
  const unresolved = query.trim() !== '' && lastCommitted.current === ''

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className={`w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:outline-none ${
          unresolved
            ? 'border-amber-400 focus:ring-amber-400'
            : 'border-gray-300 focus:ring-green-500'
        }`}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {open && matches.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {matches.map(p => (
            <button
              key={p.itemCode}
              type="button"
              onMouseDown={() => pick(p.name)}
              className="w-full text-left px-3 py-2 hover:bg-green-50 text-sm flex items-center justify-between gap-2 border-b border-gray-50 last:border-0"
            >
              <span className="font-medium text-gray-800">{p.name}</span>
              <span className="text-xs text-gray-400 font-mono shrink-0">{p.itemCode}</span>
            </button>
          ))}
        </div>
      )}

      {noMatch && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs text-amber-600">
          No matching packing item — add it in Settings → Packing Items first
        </div>
      )}
    </div>
  )
}
