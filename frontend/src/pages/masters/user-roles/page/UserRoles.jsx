import { useState } from 'react'
import { UserCog, Plus, Pencil, Power, KeyRound } from 'lucide-react'
import { useUsers, useRoles, useCreateUser, useUpdateUser, useSetUserActive, useResetPassword, useSetUserRoles } from '../../../../hooks/masters/useUserRoles.js'
import { Button, BackButton, IconButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import UserFormDrawer from '../components/UserFormDrawer.jsx'

const emptyForm = { email: '', fullName: '', phone: '', password: '', plants: [], roleIds: [] }

export default function UserRoles() {
  const { data: users = [], isLoading: loadingUsers, error: usersError } = useUsers()
  const { data: roles = [], isLoading: loadingRoles } = useRoles()

  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState(emptyForm)
  const [msg, setMsg]           = useState('')

  const createUser    = useCreateUser()
  const updateUser     = useUpdateUser()
  const setUserRoles   = useSetUserRoles()
  const setUserActive  = useSetUserActive()
  const resetPassword  = useResetPassword()
  const saving = createUser.isPending || updateUser.isPending || setUserRoles.isPending

  const openAdd = () => { setEditing(null); setForm(emptyForm); setMsg(''); setShowForm(true) }
  const openEdit = (u) => {
    setEditing(u)
    setForm({
      email: u.email || '', fullName: u.fullName || '', phone: u.phone || '',
      password: '', plants: u.plants || [], roleIds: u.roles.map(r => r.roleId),
    })
    setMsg(''); setShowForm(true)
  }

  const save = async () => {
    if (!form.fullName.trim() || (!editing && (!form.email.trim() || !form.password))) {
      setMsg('Fill all required fields'); return
    }
    setMsg('')
    try {
      if (editing) {
        await updateUser.mutateAsync({ userId: editing.userId, data: { fullName: form.fullName, phone: form.phone || null, plants: form.plants } })
        await setUserRoles.mutateAsync({ userId: editing.userId, roleIds: form.roleIds })
      } else {
        await createUser.mutateAsync({ email: form.email, fullName: form.fullName, password: form.password, plants: form.plants, roleIds: form.roleIds })
      }
      setShowForm(false)
    } catch (e) { setMsg(e.message) }
  }

  const toggleActive = async (u) => {
    const verb = u.isActive ? 'disable' : 're-enable'
    if (!confirm(`${verb === 'disable' ? 'Disable' : 'Re-enable'} login for ${u.email}?`)) return
    try { await setUserActive.mutateAsync({ userId: u.userId, isActive: !u.isActive }) }
    catch (e) { alert(e.message) }
  }

  const doResetPassword = async (u) => {
    const pw = prompt(`New password for ${u.email}:`)
    if (!pw) return
    try { await resetPassword.mutateAsync({ userId: u.userId, password: pw }); alert('Password updated.') }
    catch (e) { alert(e.message) }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={UserCog}
        title="User Roles"
        description="Assign system roles and plant scope to employee login accounts."
        actions={<>
          <Can permission="admin.users.create">
            <Button variant="primary" icon={Plus} onClick={openAdd}>New User</Button>
          </Can>
          <BackButton />
        </>}
      />

      <div className="p-6">
        {usersError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{usersError.message}</div>
        )}

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
                          <IconButton icon={Pencil} tooltip="Edit / Assign Roles" onClick={() => openEdit(u)} />
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
      </div>

      {showForm && (
        <UserFormDrawer
          editing={editing}
          form={form}
          roles={roles}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={saving}
          msg={msg}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  )
}
