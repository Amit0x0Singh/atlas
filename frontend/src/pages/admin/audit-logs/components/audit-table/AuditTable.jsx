import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import Pagination from '../../../../../components/pagination/Pagination.jsx'
import AuditToolbar from './AuditToolbar.jsx'

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  RESTORE: 'bg-purple-100 text-purple-700',
  LOGIN: 'bg-gray-100 text-gray-600',
  LOGOUT: 'bg-gray-100 text-gray-600',
  LOGIN_FAILED: 'bg-red-100 text-red-700',
  IMPORT: 'bg-amber-100 text-amber-700',
  CANCEL: 'bg-orange-100 text-orange-700',
  DISPATCH: 'bg-indigo-100 text-indigo-700',
  ENABLE: 'bg-emerald-100 text-emerald-700',
  DISABLE: 'bg-gray-200 text-gray-600',
}

const COLUMN_DEFS = [
  { key: 'user',      label: 'User',     defaultWidth: 180 },
  { key: 'action',    label: 'Action',   defaultWidth: 130 },
  { key: 'module',    label: 'Module',   defaultWidth: 120 },
  { key: 'tableName', label: 'Resource', defaultWidth: 160 },
  { key: 'recordId',  label: 'Record ID', defaultWidth: 200 },
  { key: 'createdAt', label: 'Date',     defaultWidth: 170 },
]
const MIN_COL_WIDTH = 60

// `items` is already the current page's rows (filtering + sorting +
// pagination all happen server-side — see backend/src/services/audit-log.service.js).
export default function AuditTable({
  items, total, loading, page, limit, onRowClick, onPageChange, onLimitChange,
  search, onSearchChange, filters, onFiltersChange, sort, onSortChange,
  userOptions, actionOptions, moduleOptions, tableOptions, onExport, exporting,
}) {
  const [columnWidths, setColumnWidths] = useState(() =>
    Object.fromEntries(COLUMN_DEFS.map(c => [c.key, c.defaultWidth])))

  function startResize(key) {
    return (e) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = columnWidths[key]
      function onMove(ev) {
        setColumnWidths(w => ({ ...w, [key]: Math.max(MIN_COL_WIDTH, startWidth + (ev.clientX - startX)) }))
      }
      function onUp() {
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <AuditToolbar
        search={search} onSearchChange={onSearchChange}
        filters={filters} onFiltersChange={onFiltersChange}
        sort={sort} onSortChange={onSortChange}
        userOptions={userOptions} actionOptions={actionOptions} moduleOptions={moduleOptions} tableOptions={tableOptions}
        onExport={onExport} exporting={exporting}
        resultCount={total}
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
            <tr>
              {COLUMN_DEFS.map(c => (
                <th
                  key={c.key}
                  style={{ width: columnWidths[c.key] }}
                  className="relative text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap select-none"
                >
                  {c.label}
                  <div
                    onMouseDown={startResize(c.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={COLUMN_DEFS.length} className="py-14 text-center text-gray-400">
                  <Loader2 size={22} className="animate-spin mx-auto mb-2" />
                  Loading audit logs…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={COLUMN_DEFS.length} className="text-center py-10 text-gray-400">
                  No audit records found.
                </td>
              </tr>
            ) : items.map(row => (
              <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" onClick={() => onRowClick(row)}>
                <td className="px-4 py-3 font-medium text-gray-800 truncate">{row.fullName || row.username || '—'}</td>
                <td className="px-4 py-3 truncate">
                  <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${ACTION_COLORS[row.action] || 'bg-gray-100 text-gray-600'}`}>
                    {row.action}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 truncate capitalize">{row.module || '—'}</td>
                <td className="px-4 py-3 text-gray-500 truncate font-mono text-xs">{row.tableName || '—'}</td>
                <td className="px-4 py-3 text-gray-500 truncate font-mono text-xs">{row.recordId || '—'}</td>
                <td className="px-4 py-3 text-gray-500 truncate">{new Date(row.createdAt).toLocaleString('en-IN')}</td>
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

export { ACTION_COLORS }
