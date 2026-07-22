import { Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../../components/ui'

const ROLE_TYPE_STYLE = {
  INGREDIENT: 'bg-gray-100 text-gray-600',
  CARRIER:    'bg-purple-100 text-purple-700',
  BASE:       'bg-blue-100 text-blue-700',
  MICROBE:    'bg-emerald-100 text-emerald-700',
}

export default function BomRow({
  row, idx, searchValue, isDropOpen, hits, isProductCode,
  onSearchChange, onSearchFocus, onSearchBlur, onSelectHit,
  onUpdateRow, onRemoveRow,
}) {
  return (
    <tr className={`border-b border-gray-100 ${
      row.roleType === 'CARRIER' ? 'bg-purple-50' :
      row.roleType === 'MICROBE' ? 'bg-emerald-50' :
      row._dirty ? 'bg-yellow-50' : 'hover:bg-gray-50'
    }`}>
      <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>

      {/* Item name with autocomplete */}
      <td className="px-2 py-1 relative">
        <input
          value={searchValue !== undefined ? searchValue : row.rmName}
          onChange={e => onSearchChange(idx, e.target.value)}
          onFocus={() => onSearchFocus(idx)}
          onBlur={() => onSearchBlur(idx)}
          placeholder="Type to search item..."
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400"
        />
        {isDropOpen && hits.length > 0 && (
          <div className="absolute z-30 left-2 right-2 bg-white border border-gray-200 rounded-lg shadow-xl mt-0.5 max-h-44 overflow-y-auto">
            {hits.map(hit => (
              <button key={`${hit.kind}-${hit.code}`} type="button"
                onMouseDown={() => onSelectHit(idx, hit)}
                className="w-full text-left px-3 py-2 hover:bg-blue-50 text-sm border-b border-gray-50 last:border-0">
                <span className="font-medium">{hit.name}</span>
                {hit.kind === 'product' && (
                  <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 ml-2 align-middle">SFG</span>
                )}
                <span className="text-gray-400 text-xs ml-2">{hit.code}</span>
                {hit.uom && <span className="text-gray-300 text-xs ml-1">· {hit.uom}</span>}
              </button>
            ))}
          </div>
        )}
      </td>

      <td className="px-2 py-1">
        <div className="relative">
          <input value={row.rmCode} readOnly
            className={`w-full border border-gray-100 rounded px-2 py-1.5 text-xs bg-gray-50 font-mono ${isProductCode(row.rmCode) ? 'text-blue-700 pr-9' : 'text-blue-700'}`} />
          {isProductCode(row.rmCode) && (
            <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 rounded px-1 py-0.5" title="This code comes from Product Master (SFG), not RM Master">SFG</span>
          )}
        </div>
      </td>
      <td className="px-2 py-1">
        <input type="number" step="0.001" min="0" value={row.qtyPerUnit}
          onChange={e => onUpdateRow(idx, 'qtyPerUnit', e.target.value)}
          placeholder="0.000"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400 text-right" />
      </td>
      <td className="px-2 py-1">
        <input value={row.uom} onChange={e => onUpdateRow(idx, 'uom', e.target.value)}
          placeholder="KG"
          className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-1 focus:ring-blue-400" />
      </td>
      <td className="px-2 py-1">
        <select value={row.roleType || 'INGREDIENT'} onChange={e => onUpdateRow(idx, 'roleType', e.target.value)}
          className={`w-full border rounded px-2 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-purple-400 ${ROLE_TYPE_STYLE[row.roleType] || ROLE_TYPE_STYLE.INGREDIENT} border-current`}>
          <option value="INGREDIENT">Ingredient</option>
          <option value="MICROBE">Microbe / CFU</option>
          <option value="CARRIER">Carrier 🔄</option>
          <option value="BASE">Base</option>
        </select>
      </td>
      <td className="px-2 py-1 text-center">
        <IconButton icon={Trash2} variant="danger" tooltip="Remove row" onClick={() => onRemoveRow(idx)} />
      </td>
    </tr>
  )
}
