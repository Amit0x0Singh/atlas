import { useState } from 'react'
import { Columns3 } from 'lucide-react'

/**
 * "Columns" button + anchored checklist popup for toggling table column
 * visibility — extracted from the pattern first built for the Users table
 * (frontend/src/pages/masters/user-roles/components/UsersTable.jsx) so
 * every resizable table can share one implementation.
 */
export default function ColumnsMenu({ columns, visibility, onToggle }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100"
      >
        <Columns3 size={13} /> Columns
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1.5">
            {columns.map((c) => (
              <label key={c.key} className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={visibility[c.key]}
                  onChange={() => onToggle(c.key)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {c.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
