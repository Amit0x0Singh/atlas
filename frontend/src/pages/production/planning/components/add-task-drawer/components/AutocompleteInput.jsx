import { useState, useRef } from 'react'
import { Inp } from './FormFields.jsx'

export default function AutocompleteInput({ value, onChange, onSelect, fetchFn, placeholder, renderOption, className = '' }) {
  const [results, setResults] = useState([])
  const [show, setShow]       = useState(false)
  const [loading, setLoading] = useState(false)
  const timer = useRef(null)

  function handleChange(v) {
    onChange(v)
    clearTimeout(timer.current)
    if (!v.trim()) { setResults([]); setShow(false); return }
    timer.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetchFn(v)
        setResults(res.data || [])
        setShow(true)
      } catch { setResults([]) }
      finally { setLoading(false) }
    }, 280)
  }

  function pick(item) {
    setShow(false)
    setResults([])
    onSelect(item)
  }

  return (
    <div className="relative">
      <Inp
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={() => { if (results.length) setShow(true) }}
        onBlur={() => setTimeout(() => setShow(false), 180)}
        placeholder={placeholder}
        className={`w-full ${className}`}
      />
      {loading && (
        <span className="absolute right-3 top-2.5 text-[10px] text-gray-400">searching…</span>
      )}
      {show && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
          {results.map((item, i) => (
            <button key={i} type="button"
              onMouseDown={() => pick(item)}
              className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
              {renderOption(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
