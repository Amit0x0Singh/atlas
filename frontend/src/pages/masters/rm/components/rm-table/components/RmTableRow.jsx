import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../../components/ui'
import TruncatedText from './TruncatedText.jsx'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

const TRACKING_BADGE = {
  PACK: 'bg-blue-100 text-blue-700',
  BULK: 'bg-green-100 text-green-700',
}

const CONVERSION_BADGE = {
  true:  'bg-amber-100 text-amber-700',
  false: 'bg-gray-100 text-gray-500',
}

export default function RmTableRow({ item, onEdit, onDelete, onRowClick }) {
  return (
    <tr
      className="group hover:bg-blue-50/60 transition-colors cursor-pointer"
      onClick={() => onRowClick(item)}
    >
      <td className="px-4 py-3 max-w-0">
        <div className="flex flex-col min-w-0">
          <span className="font-mono text-blue-700 font-medium text-xs">{item.itemCode}</span>
          <TruncatedText text={toTitleCase(item.itemName)} className="text-gray-800" />
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs font-medium">{item.inventoryUom?.toUpperCase()}</span>
      </td>
      <td className="px-4 py-3">
        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs font-medium">{(item.operationalUom || item.inventoryUom)?.toUpperCase()}</span>
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TRACKING_BADGE[item.trackingType || 'PACK']}`}>
          {item.trackingType || 'PACK'}
        </span>
      </td>
      <td className="px-4 py-3 max-w-0">
        {item.category ? (
          <div className="flex flex-col min-w-0">
            <TruncatedText text={toTitleCase(item.category)} className="text-blue-600 font-medium text-xs" />
            {item.subCategory && (
              <TruncatedText text={toTitleCase(item.subCategory)} className="text-rose-500 text-xs mt-0.5" />
            )}
          </div>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {item.state?.toUpperCase() || '—'}
      </td>
      <td className="px-4 py-3">
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONVERSION_BADGE[!!item.conversionRequired]}`}>
          {item.conversionRequired ? 'Yes' : 'No'}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {item.density ?? '—'}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        <span className="font-semibold text-red-600">{item.lowStockLevel ?? 0}</span>
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
          <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.itemCode)} />
        </div>
      </td>
    </tr>
  )
}
