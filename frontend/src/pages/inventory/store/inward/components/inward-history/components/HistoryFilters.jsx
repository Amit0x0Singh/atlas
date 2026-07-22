import { RefreshCw } from 'lucide-react'
import { Button } from '../../../../../../../components/ui'

export default function HistoryFilters({
  searchText, setSearchText,
  supplierFilter, setSupplierFilter, suppliers,
  dateFrom, setDateFrom, dateTo, setDateTo,
  hasFilters, onClear, onRefresh,
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="Search item, code, lot, invoice?"
          className="flex-1 min-w-48 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
        />

        <select
          value={supplierFilter}
          onChange={e => setSupplierFilter(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 min-w-36"
        >
          <option value="">All Suppliers</option>
          {suppliers.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <div className="flex items-center gap-1.5">
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {hasFilters && (
          <Button variant="danger" size="sm" onClick={onClear}>Clear</Button>
        )}

        <Button variant="outline-gray" size="sm" icon={RefreshCw} onClick={onRefresh}>Refresh</Button>
      </div>
    </div>
  )
}
