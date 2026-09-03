import { UserRound } from 'lucide-react'
import { PageHeader, BackButton } from '../../../components/ui'
import { useApp } from '../../../context/context.jsx'
import { summarizePermissionKeys } from '../../../constants/permissionMatrix.js'

const titleCase = (s) =>
  String(s || '')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())

function Field({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-sm text-gray-900 break-words">{value || '—'}</span>
    </div>
  )
}

export default function ProfilePage() {
  const { user } = useApp()

  if (!user) return null

  const displayName = titleCase(user.fullName) || user.username || 'User'
  const initials = (user.fullName || user.username || user.email || '?')
    .split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()
  const access = summarizePermissionKeys(user.permissions)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={UserRound}
        title="My Profile"
        description="Your account details and access."
        actions={<BackButton />}
      />

      <div className="p-4 md:p-6 w-full">
        <div className="bg-white border border-gray-200 rounded-2xl p-5 md:p-6 w-full">
          <div className="flex items-center gap-4 pb-5 border-b border-gray-100">
            <span className="shrink-0 w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center text-lg font-bold">
              {initials}
            </span>
            <div className="min-w-0">
              <div className="text-lg font-bold text-gray-900 truncate">{displayName}</div>
              <div className="text-sm text-gray-500 truncate">{user.email}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-5">
            <Field label="Full name" value={titleCase(user.fullName)} />
            <Field label="Username" value={user.username} />
            <Field label="Email" value={user.email} />
            <Field label="Phone" value={user.phone} />
            <Field label="Department" value={user.department} />
            <Field label="Plants" value={(user.plants || []).join(', ')} />
          </div>

          <div className="pt-5 mt-5 border-t border-gray-100">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Roles</span>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {(user.roles || []).length
                ? user.roles.map((role) => (
                    <span key={role} className="bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-full">
                      {role}
                    </span>
                  ))
                : <span className="text-sm text-gray-500">—</span>}
            </div>
          </div>

          <div className="pt-5 mt-5 border-t border-gray-100">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              What you can access
            </span>
            {access.length ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                {access.map(({ area, actions }) => (
                  <div key={area} className="border border-gray-200 rounded-xl px-3.5 py-3">
                    <div className="text-sm font-semibold text-gray-900">{area}</div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {actions.map((a) => (
                        <span key={a} className="bg-indigo-50 text-indigo-700 text-[11px] font-medium px-2 py-0.5 rounded-full">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-2">No access areas assigned.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
