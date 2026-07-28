import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../../components/ui'
import { formatMeasurement } from '../../../../../../utils/measurement/formatMeasurement.js'

const ROLE_TYPE_STYLE = {
  INGREDIENT: 'bg-gray-100 text-gray-600',
  CARRIER:    'bg-purple-100 text-purple-700',
  BASE:       'bg-blue-100 text-blue-700',
  MICROBE:    'bg-emerald-100 text-emerald-700',
}
const ROLE_TYPE_LABEL = {
  INGREDIENT: 'Ingredient',
  CARRIER:    'Carrier 🔄',
  BASE:       'Base',
  MICROBE:    'Microbe / CFU',
}

// Read-only row — all editing (item, qty, uom, role) happens in
// BomRowEditModal via the Action column's Edit button, so the table itself
// stays a clean, glanceable summary instead of a wall of inline inputs.
export default function BomRow({ row, idx, isProductCode, onEdit, onRemoveRow }) {
  const qty = parseFloat(row.qtyPerUnit) || 0
  const friendly = formatMeasurement(qty, row.uom)

  return (
    <tr className={`border-b border-gray-100 ${
      row.roleType === 'CARRIER' ? 'bg-purple-50' :
      row.roleType === 'MICROBE' ? 'bg-emerald-50' :
      row._dirty ? 'bg-yellow-50' : 'hover:bg-gray-50'
    }`}>
      <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>

      <td className="px-3 py-2 text-sm text-gray-800 truncate" title={row.rmName}>{row.rmName || <span className="text-gray-300">—</span>}</td>

      <td className="px-3 py-2 truncate">
        <span className="font-mono text-xs text-blue-700">{row.rmCode || '—'}</span>
        {isProductCode(row.rmCode) && (
          <span className="ml-1.5 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 align-middle" title="This code comes from Product Master (SFG), not RM Master">SFG</span>
        )}
      </td>

      <td className="px-3 py-2 text-sm font-semibold text-gray-900 text-right">
        {friendly.formatted}
      </td>

      <td className="px-3 py-2">
        <span className={`text-xs font-semibold px-2 py-0.5 rounded ${ROLE_TYPE_STYLE[row.roleType] || ROLE_TYPE_STYLE.INGREDIENT}`}>
          {ROLE_TYPE_LABEL[row.roleType] || ROLE_TYPE_LABEL.INGREDIENT}
        </span>
      </td>

      <td className="px-2 py-1">
        <div className="flex items-center justify-center gap-1.5">
          <IconButton icon={Pencil} variant="outline" tooltip="Edit row" onClick={() => onEdit(idx)} />
          <IconButton icon={Trash2} variant="danger" tooltip="Remove row" onClick={() => onRemoveRow(idx)} />
        </div>
      </td>
    </tr>
  )
}
