export default function GrandSummary({ rows }) {
  const calcRows = rows.filter((r) => r.calc && r.calc.allocations.length)
  if (!calcRows.length) return null

  return (
    <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
      <div className="text-sm font-bold text-blue-900 mb-2.5">📋 Issuance Summary — Review before confirming</div>
      <div className="space-y-1.5">
        {calcRows.map((r) => {
          const picked = r.calc.allocations.reduce((s, a) => s + Number(a.qty_issued_kg || 0), 0)
          const required = Number(r.required_qty_kg) || 0
          const isPartial = picked + 0.0009 < required
          return (
            <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-xs">
              <span className="font-semibold text-gray-800">{r.microbe_name || r.microbe_code}</span>
              <span className={isPartial ? 'text-amber-700 font-bold' : 'text-green-700 font-bold'}>
                {picked.toFixed(3)} kg{isPartial ? ` of ${required.toFixed(3)} kg (PARTIAL)` : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
