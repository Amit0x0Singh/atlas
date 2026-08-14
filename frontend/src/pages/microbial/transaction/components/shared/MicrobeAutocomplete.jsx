import { useEffect, useRef, useState } from 'react'

import { toTitleCase } from '../../../../../utils/textDisplay.js'
// Type-to-search microbe field — mirrors SupplierAutocomplete's commit
// semantics: the committed value only ever becomes a real microbe (matched
// by exact name or by clicking a suggestion); anything else leaves the
// commit empty even though the input keeps showing what was typed.
export default function MicrobeAutocomplete({ value, microbes, onSelect, placeholder = 'Type to search microbe...' }) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const lastCommitted = useRef(value || '')

  useEffect(() => {
    if ((value || '') !== lastCommitted.current) {
      setQuery(value || '')
      lastCommitted.current = value || ''
    }
  }, [value])

  const matches = query.trim()
    ? microbes.filter((m) => m.microbeName.toLowerCase().includes(query.trim().toLowerCase()) || m.microbeCode.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : []

  const handleChange = (e) => {
    const text = e.target.value
    setQuery(text)
    setOpen(true)
    const exact = microbes.find((m) => m.microbeName.toLowerCase() === text.trim().toLowerCase())
    lastCommitted.current = exact ? exact.microbeName : ''
    onSelect(exact || null)
  }

  const pick = (m) => {
    setQuery(m.microbeName)
    lastCommitted.current = m.microbeName
    onSelect(m)
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />
      {open && matches.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {matches.map((m) => (
            <button
              key={m.microbeId}
              type="button"
              onMouseDown={() => pick(m)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0"
            >
              {toTitleCase(m.microbeName)} <span className="text-gray-400 font-mono text-xs">({m.microbeCode})</span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && matches.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl px-3 py-2 text-xs text-gray-400">
          No matching microbe — add it in Microbes Master first
        </div>
      )}
    </div>
  )
}
