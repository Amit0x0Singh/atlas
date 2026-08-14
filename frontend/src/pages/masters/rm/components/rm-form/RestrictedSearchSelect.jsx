import { useEffect, useRef, useState } from 'react'

// Type-to-filter dropdown restricted to a fixed set of options — the
// committed value (what onChange reports) only ever becomes a real option,
// either by clicking a suggestion or by typing one out exactly
// (case-insensitive). Typing something that matches no option leaves the
// committed value empty, even though the input still shows the typed text.
// Used for Category / Sub Category so users can't create near-duplicate
// values through typos or inconsistent casing — same restricted-commit
// pattern as SupplierAutocomplete (gate/inward-form).
export default function RestrictedSearchSelect({ value, options, onChange, placeholder, className = '' }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen]   = useState(false)
  const lastCommitted = useRef(value || '')

  // Re-sync from the parent only when it changed for a reason other than our
  // own onChange call (e.g. the form was reset for a new item) — otherwise
  // committing "" while the user is mid-typing a non-match would wipe out
  // what they just typed.
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
  const matches = (q ? options.filter(o => o.toLowerCase().includes(q)) : options).slice(0, 20)

  const handleChange = (e) => {
    const text = e.target.value
    setQuery(text)
    setOpen(true)
    const exact = options.find(o => o.toLowerCase() === text.trim().toLowerCase())
    commit(exact || '')
  }

  const pick = (opt) => {
    setQuery(opt)
    commit(opt)
    setOpen(false)
  }

  return (
    <div className="relative">
      <input
        value={query}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className={className}
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {matches.map(opt => (
            <button
              key={opt}
              type="button"
              onMouseDown={() => pick(opt)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs border-b border-gray-50 last:border-0"
            >
              {opt}
            </button>
          ))}
        </div>
      )}
      {open && q && matches.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs text-gray-400">
          No matching value
        </div>
      )}
    </div>
  )
}
