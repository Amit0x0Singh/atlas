import { Pencil, Trash2 } from 'lucide-react'
import { IconButton } from '../../../../../components/ui'
import Pagination from '../../../../../components/pagination/Pagination.jsx'

export default function SupplierTable({ items, page, limit, onEdit, onDeactivate, onPageChange, onLimitChange }) {
  const paginated = items.slice((page - 1) * limit, page * limit)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Supplier Name</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Phone</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Email</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">GSTIN</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Address</th>
              <th className="text-left px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-10 text-gray-400">
                  No suppliers added yet. Click "Add Supplier" to start.
                </td>
              </tr>
            ) : paginated.map(item => (
              <tr key={item.supplierId} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium whitespace-nowrap">{item.supplierName}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.phone || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.email || '—'}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{item.gstin || '—'}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{item.address || '—'}</td>
                <td className="px-4 py-3 flex gap-1">
                  <IconButton icon={Pencil} tooltip="Edit" onClick={() => onEdit(item)} />
                  <IconButton icon={Trash2} variant="danger" tooltip="Deactivate" onClick={() => onDeactivate(item.supplierId, item.supplierName)} />
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
