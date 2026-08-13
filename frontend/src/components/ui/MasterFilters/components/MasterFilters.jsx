import { Search, X } from 'lucide-react'
import Button from '../../Buttons/components/Button.jsx'
import IconButton from '../../Buttons/components/IconButton.jsx'

const label    = 'text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1'
const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400'

// Tailwind's JIT scans for literal class strings, so the column count per
// breakpoint has to be a lookup rather than an interpolated `lg:grid-cols-${n}`.
const GRID_COLS = {
  1: 'sm:grid-cols-1',
  2: 'sm:grid-cols-2',
  3: 'sm:grid-cols-2 lg:grid-cols-3',
  4: 'sm:grid-cols-2 lg:grid-cols-4',
  5: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
}

function FilterChip({ label: text, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[11px] font-semibold">
      {text}
      <IconButton icon={X} size="xs" onClick={onRemove} className="text-blue-300 hover:text-blue-500" />
    </span>
  )
}

// Chip text for a date value — "yyyy-mm-dd" (the raw <input type="date">
// value) rendered as "12 Aug 2026" instead of the ISO string verbatim.
function fmtDateChip(v) {
  const d = new Date(`${v}T00:00:00`)
  return isNaN(d) ? v : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/**
 * Reusable server-side search/filter bar for master (CRUD list) pages.
 *
 * `fields`: [{ key, label, type: 'text'|'select'|'date', placeholder?, options?: [{value,label}], allLabel? }]
 * `values`: current filter values, keyed by field.key (all strings, '' = unset)
 * `resultCount`: total matching records (server-reported), shown in the summary line
 * `onChange(key, value)` / `onClear()`
 */
export default function MasterFilters({ fields, values, resultCount, onChange, onClear }) {
  const hasActiveFilters = Object.values(values).some(v => (v ?? '').toString().trim())
  const gridCols = GRID_COLS[fields.length] || GRID_COLS[5]

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-[18px] py-3.5 mb-4">
      <div className={`grid grid-cols-1 ${gridCols} gap-3`}>
        {fields.map(f => (
          <div key={f.key}>
            <label className={label}>{f.label}</label>
            {f.type === 'select' ? (
              <select
                value={values[f.key] ?? ''}
                onChange={e => onChange(f.key, e.target.value)}
                className={`${inputCls} cursor-pointer`}
              >
                <option value="">{f.allLabel || `All`}</option>
                {(f.options || []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'date' ? (
              <input
                type="date"
                value={values[f.key] ?? ''}
                max={f.max}
                min={f.min}
                onChange={e => onChange(f.key, e.target.value)}
                className={inputCls}
              />
            ) : (
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder={f.placeholder || `Search ${f.label.toLowerCase()}…`}
                  value={values[f.key] ?? ''}
                  onChange={e => onChange(f.key, e.target.value)}
                  className={`${inputCls} pl-8`}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 mt-3">
        <div className="flex-1" />
        <span className={`text-[12px] font-semibold whitespace-nowrap ${hasActiveFilters ? 'text-blue-600' : 'text-gray-400'}`}>
          {resultCount} {resultCount === 1 ? 'record' : 'records'} found
        </span>
        {hasActiveFilters && (
          <Button variant="danger" size="sm" onClick={onClear}>Clear Filters</Button>
        )}
      </div>

      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2.5 border-t border-gray-100">
          {fields.map(f => {
            const v = values[f.key]
            if (!v) return null
            const chipLabel = f.type === 'select'
              ? `${f.label}: ${(f.options || []).find(o => o.value === v)?.label || v}`
              : f.type === 'date'
                ? `${f.label}: ${fmtDateChip(v)}`
                : `${f.label}: "${v}"`
            return <FilterChip key={f.key} label={chipLabel} onRemove={() => onChange(f.key, '')} />
          })}
        </div>
      )}
    </div>
  )
}
