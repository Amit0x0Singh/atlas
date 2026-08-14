import { useState } from 'react'
import { UserCog, Plus, Pencil, Power, KeyRound, Users2, ShieldCheck, Trash2, Lock } from 'lucide-react'
import {
  useUsers, useRoles, usePermissionsCatalog,
  useCreateUser, useUpdateUser, useSetUserActive, useResetPassword, useSetUserRoles,
  useCreateRole, useUpdateRole, useDeleteRole, useSetRolePermissions,
} from '../../../../hooks/masters/useUserRoles.js'
import { Button, BackButton, IconButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import UserFormDrawer from '../components/UserFormDrawer.jsx'
import RoleEditorDrawer from '../components/RoleEditorDrawer.jsx'

const emptyUserForm = { email: '', fullName: '', phone: '', password: '', plants: [], roleIds: [] }

function StatCard({ label, value, tone }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
      <div className={`text-2xl font-bold ${tone}`}>{value}</div>
      <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">{label}</div>
    </div>
  )
}

export default function UserRoles() {
  const [tab, setTab] = useState('users') // 'users' | 'roles'

  const { data: users = [], isLoading: loadingUsers, error: usersError } = useUsers()
  const { data: roles = [], isLoading: loadingRoles } = useRoles()
  const { data: catalog = [] } = usePermissionsCatalog()

  // ── User drawer ─────────────────────────────────────────────────────────
  const [showUserForm, setShowUserForm] = useState(false)
  const [editingUser, setEditingUser]   = useState(null)
  const [userForm, setUserForm]         = useState(emptyUserForm)
  const [userMsg, setUserMsg]           = useState('')

  const createUser    = useCreateUser()
  const updateUser    = useUpdateUser()
  const setUserRoles  = useSetUserRoles()
  const setUserActive = useSetUserActive()
  const resetPassword = useResetPassword()
  const savingUser = createUser.isPending || updateUser.isPending || setUserRoles.isPending

  const openAddUser = () => { setEditingUser(null); setUserForm(emptyUserForm); setUserMsg(''); setShowUserForm(true) }
  const openEditUser = (u) => {
    setEditingUser(u)
    setUserForm({
      email: u.email || '', fullName: u.fullName || '', phone: u.phone || '',
      password: '', plants: u.plants || [], roleIds: u.roles.map(r => r.roleId),
    })
    setUserMsg(''); setShowUserForm(true)
  }

  const saveUser = async () => {
    if (!userForm.fullName.trim() || (!editingUser && (!userForm.email.trim() || !userForm.password))) {
      setUserMsg('Fill all required fields'); return
    }
    setUserMsg('')
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ userId: editingUser.userId, data: { fullName: userForm.fullName, phone: userForm.phone || null, plants: userForm.plants } })
        await setUserRoles.mutateAsync({ userId: editingUser.userId, roleIds: userForm.roleIds })
      } else {
        await createUser.mutateAsync({ email: userForm.email, fullName: userForm.fullName, password: userForm.password, plants: userForm.plants, roleIds: userForm.roleIds })
      }
      setShowUserForm(false)
    } catch (e) { setUserMsg(e.message) }
  }

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

  // ── Role drawer ──────────────────────────────────────────────────────────
  const [showRoleForm, setShowRoleForm] = useState(false)
  const [editingRole, setEditingRole]   = useState(null)
  const [roleMsg, setRoleMsg]           = useState('')

  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const setRolePermissions = useSetRolePermissions()
  const savingRole = createRole.isPending || updateRole.isPending || setRolePermissions.isPending

  const openAddRole = () => { setEditingRole(null); setRoleMsg(''); setShowRoleForm(true) }
  const openEditRole = (r) => { setEditingRole(r); setRoleMsg(''); setShowRoleForm(true) }

  const saveRole = async ({ name, description, permissionKeys }) => {
    if (!name.trim()) { setRoleMsg('Role name is required'); return }
    setRoleMsg('')
    try {
      if (editingRole) {
        if (!editingRole.isSystem) await updateRole.mutateAsync({ roleId: editingRole.roleId, data: { name, description } })
        await setRolePermissions.mutateAsync({ roleId: editingRole.roleId, permissionKeys })
      } else {
        await createRole.mutateAsync({ name, description, permissionKeys })
      }
      setShowRoleForm(false)
    } catch (e) { setRoleMsg(e.message) }
  }

  const deleteRole = useDeleteRole()
  const doDeleteRole = async (r) => {
    if (!confirm(`Delete role "${r.name}"? This only works if no user currently holds it.`)) return
    try { await deleteRole.mutateAsync(r.roleId) }
    catch (e) { alert(e.message) }
  }

  const activeUsers = users.filter(u => u.isActive).length

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
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-700 text-white text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold">User</th>
                    <th className="text-left px-4 py-3 font-semibold">Roles</th>
                    <th className="text-left px-4 py-3 font-semibold">Plant Scope</th>
                    <th className="text-left px-4 py-3 font-semibold">Status</th>
                    <th className="text-right px-4 py-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(loadingUsers || loadingRoles) ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">Loading…</td></tr>
                  ) : users.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-10 text-gray-400">No users yet.</td></tr>
                  ) : users.map(u => (
                    <tr key={u.userId} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${!u.isActive ? 'opacity-50' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{u.fullName}</div>
                        <div className="text-xs text-gray-400">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {u.roles.length === 0
                            ? <span className="text-xs text-gray-400">— none —</span>
                            : u.roles.map(r => (
                              <span key={r.roleId} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">{r.name}</span>
                            ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {u.plants?.length > 0 ? u.plants.join(', ') : <span className="text-gray-400">All plants</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Can permission="admin.users.update">
                            <IconButton icon={Pencil} tooltip="Edit / Assign Roles" onClick={() => openEditUser(u)} />
                          </Can>
                          <Can permission="admin.users.update">
                            <IconButton icon={KeyRound} tooltip="Reset Password" onClick={() => doResetPassword(u)} />
                          </Can>
                          <Can permission="admin.users.disable">
                            <IconButton icon={Power} variant={u.isActive ? 'danger' : 'success'} tooltip={u.isActive ? 'Disable' : 'Re-enable'} onClick={() => toggleActive(u)} />
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

        {/* ── Roles tab ────────────────────────────────────────────────── */}
        {tab === 'roles' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {loadingRoles ? (
              <div className="col-span-full text-center py-10 text-gray-400">Loading…</div>
            ) : roles.map(r => (
              <div key={r.roleId} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="font-bold text-sm text-gray-800 flex items-center gap-1.5">
                    {r.name}
                    {r.isSystem && <Lock size={11} className="text-gray-300" title="System role — name is locked" />}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 whitespace-nowrap">
                    {r._count?.users ?? 0} user{r._count?.users !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mb-3 flex-1">{r.description || '—'}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-gray-500">{r.permissions?.length ?? 0} permissions</span>
                  <div className="flex gap-1">
                    <Can permission="admin.roles.assign-permissions">
                      <IconButton icon={Pencil} tooltip="Edit permissions" onClick={() => openEditRole(r)} />
                    </Can>
                    <Can permission="admin.roles.delete">
                      <IconButton icon={Trash2} variant="danger" tooltip={r.isSystem ? 'System roles cannot be deleted' : 'Delete role'}
                        disabled={r.isSystem} onClick={() => doDeleteRole(r)} />
                    </Can>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUserForm && (
        <UserFormDrawer
          editing={editingUser}
          form={userForm}
          roles={roles}
          onChange={(field, val) => setUserForm(f => ({ ...f, [field]: val }))}
          saving={savingUser}
          msg={userMsg}
          onSave={saveUser}
          onClose={() => setShowUserForm(false)}
        />
      )}

      {showRoleForm && (
        <RoleEditorDrawer
          editing={editingRole}
          catalog={catalog}
          saving={savingRole}
          msg={roleMsg}
          onSave={saveRole}
          onClose={() => setShowRoleForm(false)}
        />
      )}
    </div>
  )
}
