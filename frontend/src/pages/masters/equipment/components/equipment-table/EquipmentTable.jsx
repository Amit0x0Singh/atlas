import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

// `items` is already the current page's rows (filtering + pagination happen
// server-side) — `total` is the server-reported match count, used only by
// Pagination to compute page count, not to slice anything here.
export default function EquipmentTable({ items, total, page, limit, onEdit, onDelete, onRowClick, onPageChange, onLimitChange }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Equip Code</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Equipment Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Working Volume</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Operation</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Plant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  No equipment found.
                </td>
              </tr>
            ) : items.map(item => (
              <tr key={item.equipId} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(item)}>
                <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{item.equipCode}</td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{toTitleCase(item.equipName)}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.workingVolume ?? 0}{item.workingUnit ? ` ${item.workingUnit.toUpperCase()}` : ''}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.operation || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.plant || '—'}</td>
                <td className="px-4 py-3 flex gap-1" onClick={(e) => e.stopPropagation()}>
                  <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                  <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.equipId, item.equipName)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3">
        <Pagination page={page} total={total} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
