import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

export default function EquipmentTable({ items, page, limit, onEdit, onDelete, onPageChange, onLimitChange }) {
  const paginated = items.slice((page - 1) * limit, page * limit)

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN') : '—'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Equip Code</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Equipment Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Designated Product</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Working Volume</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Working Unit</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Operation</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Plant</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Created At</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Updated At</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center py-10 text-gray-400">
                  No equipment added yet. Click "Add Equipment" to start.
                </td>
              </tr>
            ) : paginated.map(item => (
              <tr key={item.equipId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-gray-500 whitespace-nowrap">{item.equipCode}</td>
                <td className="px-4 py-3 font-medium whitespace-nowrap">{item.equipName}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.designatedProduct || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.workingVolume ?? 0}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.workingUnit || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.operation || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.plant || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(item.createdAt)}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtDate(item.updatedAt)}</td>
                <td className="px-4 py-3 flex gap-1">
                  <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                  <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(item.equipId, item.equipName)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 pb-3">
        <Pagination page={page} total={items.length} limit={limit} onChange={onPageChange} onLimitChange={onLimitChange} />
      </div>
    </div>
  )
}
