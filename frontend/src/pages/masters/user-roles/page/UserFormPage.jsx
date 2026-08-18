import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { UserCog, Shield } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import { useUsers, useRoles, useCreateUser, useUpdateUser, useSetUserRoles } from '../../../../hooks/masters/useUserRoles.js'
import { rolePlantLabels } from '../../../../constants/permissionMatrix.js'

const EMPTY_FORM = { email: '', fullName: '', phone: '', password: '', confirmPassword: '', roleIds: [] }

/** Union of every plant a set of roles' own permissions cover — plant access is entirely role-driven, set on the Roles page, never picked per-user. */
function plantsForRoles(roleIds, roles) {
  const set = new Set()
  for (const id of roleIds) {
    const role = roles.find(r => r.roleId === id)
    for (const p of rolePlantLabels(role || {})) set.add(p)
  }
  return [...set]
}

const LABEL = 'block text-xs font-medium text-gray-700 mb-1.5'
const FIELD = 'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none disabled:bg-gray-100 disabled:hover:border-gray-300'

function SectionHeading({ icon: Icon, tone, children, hint }) {
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon size={14} strokeWidth={2.5} />
        </span>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{children}</p>
      </div>
      {hint && <p className="text-[11px] text-gray-400 mt-1.5 ml-9">{hint}</p>}
    </div>
  )
}

/**
 * Full page instead of a popup — was a centered modal, per explicit feedback
 * that it "doesn't look good as a popup" for a form this size. Role(s) and
 * Plant Scope are one section, not two — plants are just another
 * module-like row here, the same way the Role Editor treats plants as more
 * rows in its single permission table rather than a separate one.
 */
export default function UserFormPage() {
  const navigate = useNavigate()
  const { userId } = useParams()
  const editing = !!userId

  const { data: users = [] } = useUsers()
  const { data: roles = [] } = useRoles()
  const existing = editing ? users.find(u => u.userId === userId) : null

  const [form, setForm] = useState(EMPTY_FORM)
  const [msg, setMsg] = useState('')
  const [loaded, setLoaded] = useState(!editing)

  useEffect(() => {
    if (editing && existing && !loaded) {
      setForm({
        email: existing.email || '', fullName: existing.fullName || '', phone: existing.phone || '',
        password: '', roleIds: existing.roles.map(r => r.roleId),
      })
      setLoaded(true)
    }
  }, [editing, existing, loaded])

  const createUser   = useCreateUser()
  const updateUser   = useUpdateUser()
  const setUserRoles = useSetUserRoles()
  const saving = createUser.isPending || updateUser.isPending || setUserRoles.isPending

  const onChange = (field, val) => setForm(f => ({ ...f, [field]: val }))
  const toggleRole = (roleId) => {
    const set = new Set(form.roleIds)
    set.has(roleId) ? set.delete(roleId) : set.add(roleId)
    onChange('roleIds', [...set])
  }

  const goBack = () => navigate('/user-roles')

  const save = async () => {
    if (!form.fullName.trim() || (!editing && (!form.email.trim() || !form.password))) {
      setMsg('Fill all required fields'); return
    }
    if (!editing && form.password !== form.confirmPassword) {
      setMsg('Password and Confirm Password do not match'); return
    }
    setMsg('')
    const plants = plantsForRoles(form.roleIds, roles)
    try {
      if (editing) {
        await updateUser.mutateAsync({ userId, data: { fullName: form.fullName, phone: form.phone || null, plants } })
        await setUserRoles.mutateAsync({ userId, roleIds: form.roleIds })
      } else {
        await createUser.mutateAsync({ email: form.email, fullName: form.fullName, password: form.password, plants, roleIds: form.roleIds })
      }
      goBack()
    } catch (e) { setMsg(e.message) }
  }

  if (editing && !existing) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader icon={UserCog} title="Edit User" actions={<BackButton onClick={goBack} />} />
        <div className="p-6 text-sm text-gray-400">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={UserCog}
        title={editing ? 'Edit User' : 'New User'}
        description={editing ? 'Update role(s) and contact details.' : 'Create a login and assign its role(s).'}
        actions={<BackButton onClick={goBack} />}
      />

      <div className="p-6">
        {msg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs mb-4">{msg}</div>
        )}

        <div className="flex flex-col gap-5">
          {/* ── Identity — its own full-width row ───────────────────────── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm w-full">
            <SectionHeading icon={UserCog} tone="bg-blue-50 text-blue-600">Identity</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className={LABEL}>Email *</label>
                <input type="email" value={form.email} disabled={editing}
                  onChange={e => onChange('email', e.target.value)} className={FIELD} placeholder="name@agrilife.com" />
              </div>
              <div>
                <label className={LABEL}>Full Name *</label>
                <input value={form.fullName} onChange={e => onChange('fullName', e.target.value)} className={FIELD} />
              </div>
              <div>
                <label className={LABEL}>Phone</label>
                <input value={form.phone} onChange={e => onChange('phone', e.target.value)} className={FIELD} />
              </div>
              {!editing && (
                <>
                  <div>
                    <label className={LABEL}>Password *</label>
                    <input type="password" value={form.password} onChange={e => onChange('password', e.target.value)} className={FIELD} />
                  </div>
                  <div>
                    <label className={LABEL}>Confirm Password *</label>
                    <input type="password" value={form.confirmPassword} onChange={e => onChange('confirmPassword', e.target.value)} className={FIELD} />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── Role(s) — its own full-width row below Identity. Which
              plants this login can reach is entirely implied by the
              role(s) picked here (see the Roles page's permission
              matrix), not a separate choice made on this form. ── */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm w-full">
            <SectionHeading icon={Shield} tone="bg-violet-50 text-violet-600" hint="Plant access follows whatever each role grants — manage it on the Roles page.">
              Role(s)
            </SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
              {roles.map(r => {
                const checked = form.roleIds.includes(r.roleId)
                return (
                  <label
                    key={r.roleId}
                    className={`flex items-start gap-2.5 rounded-xl border px-3 py-2.5 cursor-pointer transition-colors ${
                      checked ? 'border-violet-300 bg-violet-50/70' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <input type="checkbox" className="mt-0.5 accent-violet-600" checked={checked} onChange={() => toggleRole(r.roleId)} />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-gray-800">{r.name}</span>
                      {r.description && <span className="block text-[11px] text-gray-400 leading-snug mt-0.5">{r.description}</span>}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button variant="secondary" onClick={goBack}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={save}>{editing ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </div>
    </div>
  )
}
