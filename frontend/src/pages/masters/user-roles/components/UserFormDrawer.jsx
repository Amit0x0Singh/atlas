import { X, UserCog, Shield, MapPin } from 'lucide-react'
import { Button, IconButton } from '../../../../components/ui'

const PLANTS = ['Microbial', 'Nano', 'Botanical', 'Liquid', 'Powder', 'Granules']

const LABEL = 'block text-xs font-medium text-gray-700 mb-1'
const FIELD = 'w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none disabled:bg-gray-100 disabled:hover:border-gray-300'

function SectionHeading({ icon: Icon, tone, children }) {
  return (
    <div className="flex items-center gap-1.5 mb-3">
      <span className={`w-5 h-5 rounded-md flex items-center justify-center ${tone}`}>
        <Icon size={11} strokeWidth={2.5} />
      </span>
      <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide">{children}</p>
    </div>
  )
}

// Handles both create (email/username/password fields shown) and edit
// (identity fields locked, only fullName/phone/plants/roles editable) — one
// drawer, since "assign a role" and "edit this login" are the same form.
export default function UserFormDrawer({ editing, form, onChange, roles, saving, msg, onSave, onClose }) {
  const toggleRole = (roleId) => {
    const set = new Set(form.roleIds)
    set.has(roleId) ? set.delete(roleId) : set.add(roleId)
    onChange('roleIds', [...set])
  }
  const togglePlant = (plant) => {
    const set = new Set(form.plants)
    set.has(plant) ? set.delete(plant) : set.add(plant)
    onChange('plants', [...set])
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0 bg-gradient-to-br from-blue-50/80 to-white rounded-t-2xl">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
              <UserCog size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">{editing ? 'Edit User' : 'New User'}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                {editing ? 'Update role, plant scope, and contact details.' : 'Create a login and assign its role + plant scope.'}
              </p>
            </div>
          </div>
          <IconButton icon={X} tooltip="Close" onClick={onClose} className="bg-white/70" />
        </div>

        <div className="px-6 py-5 overflow-y-auto space-y-4 bg-gray-50/40">
          {msg && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs">{msg}</div>
          )}

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SectionHeading icon={UserCog} tone="bg-blue-50 text-blue-600">Identity</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={LABEL}>Email *</label>
                <input type="email" value={form.email} disabled={!!editing}
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
                <div>
                  <label className={LABEL}>Password *</label>
                  <input type="password" value={form.password} onChange={e => onChange('password', e.target.value)} className={FIELD} />
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SectionHeading icon={Shield} tone="bg-violet-50 text-violet-600">Role(s)</SectionHeading>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {roles.map(r => (
                <label key={r.roleId} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.roleIds.includes(r.roleId)} onChange={() => toggleRole(r.roleId)} />
                  {r.name}
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <SectionHeading icon={MapPin} tone="bg-emerald-50 text-emerald-600">Plant Scope</SectionHeading>
            <p className="text-[11px] text-gray-400 mb-2">Leave all unchecked for unscoped access (sees every plant).</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PLANTS.map(p => (
                <label key={p} className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={form.plants.includes(p)} onChange={() => togglePlant(p)} />
                  {p}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 shrink-0 bg-white rounded-b-2xl">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="primary" loading={saving} onClick={onSave}>{editing ? 'Save Changes' : 'Create User'}</Button>
        </div>
      </div>
    </div>
  )
}
