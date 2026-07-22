const field = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-green-500 focus:outline-none";

// ── Packing material selector with inline stock hint ─────────────────────────
export default function PackSelect({ value, onChange, materials, placeholder, allowCustom = true }) {
  const isCustom = value && !materials.find(m => m.itemName === value) && value !== '';

  function handleChange(v) {
    if (v === '__CUSTOM__') onChange('')
    else onChange(v)
  }

  // Find selected material's stock
  const selected = materials.find(m => m.itemName === value)
  const stock = selected ? Number(selected.quantity || 0) : null

  return (
    <div>
      <select
        value={isCustom ? '__CUSTOM__' : (value || '')}
        onChange={e => handleChange(e.target.value)}
        className={field}
      >
        <option value="">— {placeholder} —</option>
        {materials.map(m => (
          <option key={m.itemCode} value={m.itemName}>
            {m.itemName}
            {m.capacity ? ` (${m.capacity}${m.capacityUnit || ''})` : ''}
          </option>
        ))}
        {allowCustom && <option value="__CUSTOM__">+ Custom…</option>}
      </select>

      {/* Stock hint shown right after selection */}
      {value && !isCustom && selected && (
        <div className={`mt-1 text-[11px] font-semibold flex items-center gap-1 ${stock > 0 ? 'text-green-600' : 'text-red-500'}`}>
          {stock > 0
            ? <>✓ In Stock: {stock.toLocaleString('en-IN')} {selected.capacityUnit ? 'units' : 'Nos'}</>
            : <>⚠ No stock — request procurement</>
          }
        </div>
      )}

      {/* Custom text input */}
      {(isCustom || (value === '' && allowCustom)) && isCustom && (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder="Type custom packing…"
          className={field}
          style={{ marginTop: "6px", borderColor: "#bbf7d0" }}
        />
      )}
    </div>
  )
}
