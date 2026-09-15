import { ChevronUp, ChevronDown, ChevronsUpDown, Pencil, KeyRound, Power, Trash2 } from 'lucide-react'
import { IconButton, ColumnsMenu } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import { useColumnPreferences } from '../../../../hooks/useColumnPreferences.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'

// key, header label, the shared `sort.field` value clicking this header
// sets (so header-click sorting and the Sort-by modal stay in sync), and
// starting width for the resize handle.
const COLUMN_DEFS = [
  { key: 'user',       label: 'User',        sortField: 'name',       defaultWidth: 260 },
  { key: 'username',   label: 'Username',    sortField: 'username',   defaultWidth: 180 },
  { key: 'phone',      label: 'Phone',       sortField: 'phone',      defaultWidth: 140 },
  { key: 'roles',      label: 'Roles',       sortField: 'role',       defaultWidth: 220 },
  { key: 'plantScope', label: 'Plant Scope', sortField: 'plantScope', defaultWidth: 160 },
  { key: 'status',     label: 'Status',      sortField: 'status',     defaultWidth: 120 },
]

const ACTIONS_COL_WIDTH = 140

function SortCaret({ active, direction }) {
  if (!active) return <ChevronsUpDown size={12} className="opacity-30" />
  return direction === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
}

/**
 * Users table with a Columns show/hide menu and drag-to-resize column
 * headers (same interaction as the raw-CRUD admin panel's table), plus a
 * light header restyle (was a dark slate-700 bar) with clickable sort carets
 * that write into the same `sort` state the Sort-by popup uses.
 */
export default function UsersTable({ users, loading, empty, emptyMessage, sort, onSortChange, onEdit, onResetPassword, onToggleActive, onDelete }) {
  const { columnWidths, columnVisibility, visibleColumns, startResize, toggleColumn } = useColumnPreferences('user-roles-users', COLUMN_DEFS)

  const colCount = visibleColumns.length + 1 // + Actions

  function handleHeaderClick(sortField) {
    onSortChange(prev => ({
      field: sortField,
      direction: prev.field === sortField && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  return (
    <>
      <div className="flex justify-end px-4 py-1.5 border-b border-gray-100">
        <ColumnsMenu columns={COLUMN_DEFS} visibility={columnVisibility} onToggle={toggleColumn} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
          <thead
            className="text-xs"
            style={{ backgroundColor: 'rgb(226, 235, 240)' }}
          >
            <tr>
              {visibleColumns.map(c => (
                <th
                  key={c.key}
                  style={{ width: columnWidths[c.key] }}
                  className="relative text-left px-4 py-2.5 font-semibold text-gray-600 border-b border-gray-200 select-none"
                >
                  <button
                    type="button"
                    onClick={() => handleHeaderClick(c.sortField)}
                    className="inline-flex items-center gap-1 hover:text-gray-900"
                  >
                    {c.label}
                    <SortCaret active={sort.field === c.sortField} direction={sort.direction} />
                  </button>
                  <div
                    onMouseDown={startResize(c.key)}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize select-none touch-none hover:bg-blue-400/50"
                  />
                </th>
              ))}
              <th style={{ width: ACTIONS_COL_WIDTH }} className="text-right px-4 py-2.5 font-semibold text-gray-600 border-b border-gray-200">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={colCount} className="text-center py-10 text-gray-400">Loading…</td></tr>
            ) : empty ? (
              <tr><td colSpan={colCount} className="text-center py-10 text-gray-400">{emptyMessage}</td></tr>
            ) : users.map(u => (
              <tr key={u.userId} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                {columnVisibility.user && (
                  <td style={{ width: columnWidths.user }} className="px-4 py-3 overflow-hidden">
                    <div className="font-semibold text-gray-800 truncate">{toTitleCase(u.fullName)}</div>
                    <div className="text-xs text-gray-400 truncate">{u.email}</div>
                  </td>
                )}
                {columnVisibility.username && (
                  <td style={{ width: columnWidths.username }} className="px-4 py-3 text-xs text-gray-600 truncate">
                    {u.username}
                  </td>
                )}
                {columnVisibility.phone && (
                  <td style={{ width: columnWidths.phone }} className="px-4 py-3 text-xs text-gray-600 truncate">
                    {u.phone || <span className="text-gray-400">—</span>}
                  </td>
                )}
                {columnVisibility.roles && (
                  <td style={{ width: columnWidths.roles }} className="px-4 py-3 overflow-hidden">
                    <div className="flex flex-wrap gap-1">
                      {u.roles.length === 0
                        ? <span className="text-xs text-gray-400">— none —</span>
                        : u.roles.map(r => (
                          <span key={r.roleId} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{r.name}</span>
                        ))}
                    </div>
                  </td>
                )}
                {columnVisibility.plantScope && (
                  <td style={{ width: columnWidths.plantScope }} className="px-4 py-3 text-xs text-gray-600 truncate">
                    {u.plants?.length > 0
                      ? u.plants.join(', ')
                      // plants[] is auto-computed as the union of every plant module a
                      // user's role(s) grant (see plantsForRoles() in UserFormPage.jsx) —
                      // a role touching ALL plants (e.g. Super Admin) ends up with an
                      // explicit full list, not an empty array. So an empty array here
                      // never means "unrestricted" in practice; it means none of this
                      // user's role(s) grant access to any plant module at all (true for
                      // no role, and equally true for non-plant roles like Gate/Stores).
                      : <span className="text-red-400">No access</span>}
                  </td>
                )}
                {columnVisibility.status && (
                  <td style={{ width: columnWidths.status }} className="px-4 py-3">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                      {u.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                )}
                <td style={{ width: ACTIONS_COL_WIDTH }} className="px-4 py-3">
                  <div className="flex justify-end gap-1">
                    <Can permission="admin.users.update">
                      <IconButton icon={Pencil} tooltip="Edit / Assign Roles" onClick={() => onEdit(u)} />
                    </Can>
                    <Can permission="admin.users.update">
                      <IconButton icon={KeyRound} tooltip="Reset Password" onClick={() => onResetPassword(u)} />
                    </Can>
                    <Can permission="admin.users.disable">
                      <IconButton icon={Power} variant={u.isActive ? 'danger' : 'success'} tooltip={u.isActive ? 'Disable' : 'Re-enable'} onClick={() => onToggleActive(u)} />
                    </Can>
                    <Can permission="admin.users.delete">
                      <IconButton icon={Trash2} variant="danger" tooltip="Delete" onClick={() => onDelete(u)} />
                    </Can>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
