import { Pencil, Trash2, Eye } from 'lucide-react'
import { IconButton } from '../../../../../../components/ui'

const TRACKING_BADGE = {
  PACK: 'bg-blue-100 text-blue-700',
  BULK: 'bg-green-100 text-green-700',
}

const CONVERSION_BADGE = {
  true:  'bg-amber-100 text-amber-700',
  false: 'bg-gray-100 text-gray-500',
}

export default function RmTableRow({ item, onEdit, onDelete, onViewPacking, onRowClick }) {
  const isPacking = item.kind === 'packing'
  return (
    <tr
      className={`group hover:bg-blue-50/60 transition-colors ${!isPacking ? 'cursor-pointer' : ''}`}
      onClick={!isPacking ? () => onRowClick(item) : undefined}
    >
      <td className="px-4 py-3">
        <div className="flex flex-col">
          <span className="font-mono text-blue-700 font-medium text-xs">{item.itemCode}</span>
          <span className="text-gray-800">{item.itemName}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs font-medium">{item.inventoryUom}</span>
      </td>
      <td className="px-4 py-3">
        {isPacking ? (
          <span className="text-gray-300">—</span>
        ) : (
          <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs font-medium">{item.operationalUom || item.inventoryUom}</span>
        )}
      </td>
      <td className="px-4 py-3">
        {isPacking ? (
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 text-violet-700">PACKING</span>
        ) : (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${TRACKING_BADGE[item.trackingType || 'PACK']}`}>
            {item.trackingType || 'PACK'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {isPacking ? <span className="text-gray-300">—</span> : (item.category ? [item.category, item.subCategory].filter(Boolean).join(' / ') : '—')}
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {isPacking ? <span className="text-gray-300">—</span> : (item.state || '—')}
      </td>
      <td className="px-4 py-3">
        {isPacking ? (
          <span className="text-gray-300">—</span>
        ) : (
          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${CONVERSION_BADGE[!!item.conversionRequired]}`}>
            {item.conversionRequired ? 'Yes' : 'No'}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {isPacking ? <span className="text-gray-300">—</span> : (item.density ?? '—')}
      </td>
      <td className="px-4 py-3 whitespace-nowrap">
        {isPacking ? <span className="text-gray-300">—</span> : (
          <span className="font-semibold">
            <span className="text-red-600">{item.lowStockLevel ?? 0}</span>
            <span className="text-gray-400 mx-1">/</span>
            <span className="text-blue-600">{item.highStockLevel ?? 0}</span>
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {item.createdAt ? new Date(item.createdAt).toLocaleDateString('en-IN') : '—'}
      </td>
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {isPacking ? (
            <IconButton icon={Eye} tooltip="View in Packing Materials" onClick={onViewPacking} />
          ) : (
            <>
              <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
              <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.itemCode)} />
            </>
          )}
        </div>
      </td>
    </tr>
  )
}
