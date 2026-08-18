import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserCog, Plus, Pencil, Users2, ShieldCheck, Trash2, Lock } from 'lucide-react'
import {
  useUsers, useRoles, useSetUserActive, useResetPassword, useDeleteRole,
} from '../../../../hooks/masters/useUserRoles.js'
import { Button, BackButton, IconButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import UsersToolbar, { EMPTY_USER_FILTERS, DEFAULT_USER_SORT } from '../components/UsersToolbar.jsx'
import UsersTable from '../components/UsersTable.jsx'
import RoleDetailModal from '../components/RoleDetailModal.jsx'
import { roleModuleLabels } from '../../../../constants/permissionMatrix.js'

function StatCard({ label, value, tone }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  )
}

const TONE_CLASSES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
}

function ChipList({ items, tone = 'indigo', max = 3, emptyLabel = '—' }) {
  if (!items.length) return <span className="text-gray-300">{emptyLabel}</span>
  const shown = items.slice(0, max)
  const extra = items.length - shown.length
  return (
    <div className="flex flex-wrap gap-1">
      {shown.map(m => (
        <span key={m} className={`text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${TONE_CLASSES[tone]}`}>
          {m}
        </span>
      ))}
      {extra > 0 && (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 whitespace-nowrap">
          +{extra} more
        </span>
      )}
    </div>
  )
}

export default function UserRoles() {
  const navigate = useNavigate()
  const [tab, setTab] = useState('users') // 'users' | 'roles'

  const { data: users = [], isLoading: loadingUsers, error: usersError } = useUsers()
  const { data: roles = [], isLoading: loadingRoles } = useRoles()

  const [viewingRole, setViewingRole] = useState(null)

  // New User / Edit User and New Role / Edit Role now live on their own
  // pages (not popups — see UserFormPage.jsx / RoleFormPage.jsx) since a
  // form this size read poorly as a centered modal.
  const openAddUser  = () => navigate('/user-roles/users/new')
  const openEditUser = (u) => navigate(`/user-roles/users/${u.userId}`)
  const openAddRole  = () => navigate('/user-roles/roles/new')
  const openEditRole = (r) => navigate(`/user-roles/roles/${r.roleId}`)

  const setUserActive = useSetUserActive()
  const resetPassword = useResetPassword()

  const toggleActive = async (u) => {
    if (!confirm(`${u.isActive ? 'Disable' : 'Re-enable'} login for ${u.email}?`)) return
    try { await setUserActive.mutateAsync({ userId: u.userId, isActive: !u.isActive }) }
    catch (e) { alert(e.message) }
  }

  const doResetPassword = async (u) => {
    const pw = prompt(`New password for ${u.email}:`)
    if (!pw) return
    try { await resetPassword.mutateAsync({ userId: u.userId, password: pw }); alert('Password updated.') }
    catch (e) { alert(e.message) }
  }

  const deleteRole = useDeleteRole()
  const doDeleteRole = async (r) => {
    if (!confirm(`Delete role "${r.name}"? This only works if no user currently holds it.`)) return
    try { await deleteRole.mutateAsync(r.roleId) }
    catch (e) { alert(e.message) }
  }

  const activeUsers = users.filter(u => u.isActive).length

  // ── Users table toolbar: search + filter + sort ─────────────────────────
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_USER_FILTERS)
  const [sort, setSort] = useState(DEFAULT_USER_SORT)

  const visibleUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    const kw = filters.keyword.trim().toLowerCase()

    let list = users.filter(u => {
      if (q) {
        const haystack = `${u.fullName} ${u.email} ${u.phone || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (kw) {
        const haystack = `${u.fullName} ${u.email} ${u.phone || ''}`.toLowerCase()
        if (!haystack.includes(kw)) return false
      }
      const signupDate = u.createdAt?.slice(0, 10) || ''
      if (filters.dateFrom && signupDate < filters.dateFrom) return false
      if (filters.dateTo && signupDate > filters.dateTo) return false
      if (filters.roleId && !u.roles.some(r => r.roleId === filters.roleId)) return false
      if (filters.plant && !(u.plants || []).includes(filters.plant)) return false
      if (filters.status === 'active' && !u.isActive) return false
      if (filters.status === 'disabled' && u.isActive) return false
      return true
    })

    const dir = sort.direction === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sort.field === 'signupDate') return dir * a.createdAt.localeCompare(b.createdAt)
      if (sort.field === 'role') return dir * (a.roles[0]?.name || '').localeCompare(b.roles[0]?.name || '')
      if (sort.field === 'plantScope') return dir * (a.plants?.[0] || '').localeCompare(b.plants?.[0] || '')
      if (sort.field === 'status') return dir * (Number(a.isActive) - Number(b.isActive))
      return dir * a.fullName.localeCompare(b.fullName) // 'name'
    })

    return list
  }, [users, search, filters, sort])

  function exportUsersCsv() {
    if (!visibleUsers.length) { alert('No users to export — adjust your filters.'); return }
    const headers = ['Client ID', 'Name', 'Email', 'Phone', 'Roles', 'Plant Scope', 'Status', 'Sign-up Date']
    const rows = visibleUsers.map(u => [
      u.userId, u.fullName, u.email, u.phone || '',
      u.roles.map(r => r.name).join('; '),
      u.plants?.length ? u.plants.join('; ') : 'All plants',
      u.isActive ? 'Active' : 'Disabled',
      u.createdAt?.slice(0, 10) || '',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `users_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={UserCog}
        title="User Roles"
        description="Assign system roles and plant scope to employee login accounts."
        actions={<>
          {tab === 'users' ? (
            <Can permission="admin.users.create">
              <Button variant="primary" icon={Plus} onClick={openAddUser}>New User</Button>
            </Can>
          ) : (
            <Can permission="admin.roles.create">
              <Button variant="primary" icon={Plus} onClick={openAddRole}>New Role</Button>
            </Can>
          )}
          <BackButton />
        </>}
      />

      <div className="p-6">
        {/* Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <StatCard label="Total Roles" value={roles.length} tone="text-violet-600" />
          <StatCard label="Total Users" value={users.length} tone="text-blue-600" />
          <StatCard label="Active Logins" value={activeUsers} tone="text-green-600" />
          <StatCard label="Disabled Logins" value={users.length - activeUsers} tone="text-gray-400" />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200 mb-5">
          <button onClick={() => setTab('users')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === 'users' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
            <Users2 size={14} /> Users
          </button>
          <button onClick={() => setTab('roles')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === 'roles' ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-600'}`}>
            <ShieldCheck size={14} /> Roles
          </button>
        </div>

        {usersError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{usersError.message}</div>
        )}

        {/* ── Users tab ────────────────────────────────────────────────── */}
        {tab === 'users' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <UsersToolbar
              search={search} onSearchChange={setSearch}
              filters={filters} onFiltersChange={setFilters}
              sort={sort} onSortChange={setSort}
              roles={roles} onExport={exportUsersCsv}
              resultCount={visibleUsers.length}
            />
            <UsersTable
              users={visibleUsers}
              loading={loadingUsers || loadingRoles}
              empty={users.length === 0 || visibleUsers.length === 0}
              emptyMessage={users.length === 0 ? 'No users yet.' : 'No users match your search/filters.'}
              sort={sort}
              onSortChange={setSort}
              onEdit={openEditUser}
              onResetPassword={doResetPassword}
              onToggleActive={toggleActive}
            />
          </div>
        )}

        {/* ── Roles tab ────────────────────────────────────────────────── */}
        {tab === 'roles' && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-600 text-xs" style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
                    <th className="text-left px-4 py-3 font-semibold">Role</th>
                    <th className="text-left px-4 py-3 font-semibold">Modules</th>
                    <th className="text-left px-4 py-3 font-semibold">Users</th>
                    <th className="text-left px-4 py-3 font-semibold">Permissions</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loadingRoles ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
                  ) : roles.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">No roles yet.</td></tr>
                  ) : roles.map(r => (
                    <tr
                      key={r.roleId}
                      onClick={() => setViewingRole(r)}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-800 flex items-center gap-1.5">
                          {r.name}
                          {r.isSystem && <Lock size={11} className="text-gray-300" />}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChipList items={roleModuleLabels(r)} tone="indigo" max={4} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">
                          {r._count?.users ?? 0} user{r._count?.users !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{r.permissions?.length ?? 0}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <Can permission="admin.roles.assign-permissions">
                            <IconButton icon={Pencil} tooltip="Edit permissions" onClick={() => openEditRole(r)} />
                          </Can>
                          <Can permission="admin.roles.delete">
                            <IconButton icon={Trash2} variant="danger" tooltip={r.isSystem ? 'System roles cannot be deleted' : 'Delete role'}
                              disabled={r.isSystem} onClick={() => doDeleteRole(r)} />
                          </Can>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      <RoleDetailModal
        role={viewingRole}
        onClose={() => setViewingRole(null)}
        onEdit={openEditRole}
        onDelete={doDeleteRole}
      />
    </div>
  )
}
