import { Pencil, Trash2, Eye } from 'lucide-react'
import { IconButton } from '../../../../../../components/ui'
import { getChips, Chip } from '../../../../packing/components/packing-constants/packingConstants.jsx'

const TRACKING_BADGE = {
  PACK: 'bg-blue-100 text-blue-700',
  BULK: 'bg-green-100 text-green-700',
}

export default function RmTableRow({ item, onEdit, onDelete, onViewPacking, onRowClick }) {
  const isPacking = item.kind === 'packing'
  return (
    <tr
      className={`group hover:bg-blue-50/60 transition-colors ${!isPacking ? 'cursor-pointer' : ''}`}
      onClick={!isPacking ? () => onRowClick(item) : undefined}
    >
      <td className="px-4 py-3 font-mono text-blue-700 font-medium whitespace-nowrap">{item.itemCode}</td>
      <td className="px-4 py-3 text-gray-800">{item.itemName}</td>
      <td className="px-4 py-3">
        <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 text-xs font-medium">{item.uom}</span>
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
      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
        {isPacking ? <span className="text-gray-300">—</span> : (item.density ?? '—')}
      </td>
      <td className="px-4 py-3 max-w-xs">
        {isPacking ? (
          <div className="flex flex-wrap items-center gap-1">
            {item.subType && (
              <span className="text-[11px] font-semibold text-violet-600 mr-1 whitespace-nowrap">{item.subType}</span>
            )}
            {getChips(item).length > 0
              ? getChips(item).map((c, i) => <Chip key={i} label={c.label} color={c.color} italic={c.italic} />)
              : <span className="text-xs text-gray-300 italic">No spec recorded</span>}
          </div>
        ) : (
          <span className="text-gray-300">—</span>
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
