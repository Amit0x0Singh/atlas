import { Lock, ShieldCheck, Pencil, Trash2, Clock } from 'lucide-react'
import { Modal, Button } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import { roleModuleLabels } from '../../../../constants/permissionMatrix.js'
import { useUserDisplayNames } from '../../../../hooks/masters/useUserDisplayNames.js'

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  : '—'

/**
 * Centered popup showing everything the old role card used to show inline
 * (most importantly the description) — opened by clicking a row in the
 * Roles table instead of it taking up permanent space in every row.
 */
export default function RoleDetailModal({ role, onClose, onEdit, onDelete }) {
  const displayName = useUserDisplayNames()
  if (!role) return null
  const modules = roleModuleLabels(role)

  return (
    <Modal open={!!role} onClose={onClose} size="sm">
      <div className="flex items-start gap-3 px-5 py-4 border-b border-gray-100">
        <span className="w-9 h-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={17} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
            {role.name}
            {role.isSystem && <Lock size={12} className="text-gray-300 flex-shrink-0" />}
          </h2>
          {role.isSystem && <p className="text-[11px] text-gray-400 mt-0.5">System role — name is locked</p>}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Description</p>
          <p className="text-sm text-gray-700 leading-relaxed">{role.description || '—'}</p>
        </div>

        <div>
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">Modules</p>
          {modules.length ? (
            <div className="flex flex-wrap gap-1">
              {modules.map(m => (
                <span key={m} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600">
                  {m}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">—</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
            <div className="text-xl font-bold text-gray-900">{role._count?.users ?? 0}</div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">User{role._count?.users !== 1 ? 's' : ''}</div>
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
            <div className="text-xl font-bold text-gray-900">{role.permissions?.length ?? 0}</div>
            <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mt-0.5">Permissions</div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-2.5 border-t border-gray-100 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><Clock size={12} /> Created by {displayName(role.createdBy)} · {fmtDateTime(role.createdAt)}</span>
        <span className="flex items-center gap-1.5"><Clock size={12} /> Updated by {displayName(role.updatedBy)} · {fmtDateTime(role.updatedAt)}</span>
      </div>

      <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-gray-100 bg-gray-50/60">
        <Can permission="admin.roles.delete">
          <Button
            variant="danger"
            disabled={role.isSystem}
            onClick={() => { onDelete(role); onClose() }}
            icon={Trash2}
          >
            {role.isSystem ? 'System role' : 'Delete'}
          </Button>
        </Can>
        <Can permission="admin.roles.assign-permissions">
          <Button variant="primary" icon={Pencil} onClick={() => { onEdit(role); onClose() }}>
            Edit permissions
          </Button>
        </Can>
      </div>
    </Modal>
  )
}
