import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ShieldCheck, Lock } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import { useRoles, usePermissionsCatalog, useCreateRole, useUpdateRole, useSetRolePermissions } from '../../../../hooks/masters/useUserRoles.js'
import { MODULE_ORDER, MODULE_LABELS, PLANT_MODULE_ORDER, PLANT_MODULE_LABELS, COARSE_ACTIONS, buildModuleIndex, cellState, toggleCell } from '../../../../constants/permissionMatrix.js'

const ALL_LABELS = { ...MODULE_LABELS, ...PLANT_MODULE_LABELS }

const LABEL = 'block text-xs font-medium text-gray-700 mb-1'
const FIELD = 'w-full bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 text-xs text-gray-900 transition-colors hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 outline-none disabled:bg-gray-100 disabled:hover:border-gray-300'

// Tri-state checkbox — native <input> has no "indeterminate" attribute, only
// a DOM property, so it's set imperatively via a ref callback.
function Checkbox({ checked, indeterminate, disabled, onChange }) {
  return (
    <input
      type="checkbox"
      disabled={disabled}
      checked={checked}
      ref={(el) => { if (el) el.indeterminate = indeterminate }}
      onChange={onChange}
      className="w-4 h-4 accent-blue-600 disabled:opacity-25 cursor-pointer disabled:cursor-not-allowed"
    />
  )
}

/** Full page instead of a popup — was a centered modal, per explicit feedback that it "doesn't look good as a popup". */
export default function RoleFormPage() {
  const navigate = useNavigate()
  const { roleId } = useParams()
  const editing = !!roleId

  const { data: roles = [], isLoading: loadingRoles } = useRoles()
  const { data: catalog = [] } = usePermissionsCatalog()
  const existingRole = editing ? roles.find(r => r.roleId === roleId) : null

  const [name, setName]               = useState('')
  const [description, setDescription] = useState('')
  const [selectedKeys, setSelectedKeys] = useState(null)
  const [msg, setMsg] = useState('')

  // Seed local form state once the role has loaded (roles list is fetched
  // async — can't read `existingRole` synchronously on first render).
  useEffect(() => {
    if (editing && existingRole && selectedKeys === null) {
      setName(existingRole.name || '')
      setDescription(existingRole.description || '')
      setSelectedKeys(new Set((existingRole.permissions || []).map(rp => rp.permission.key)))
    } else if (!editing && selectedKeys === null) {
      setSelectedKeys(new Set())
    }
  }, [editing, existingRole, selectedKeys])

  const moduleIndex = useMemo(() => buildModuleIndex(catalog), [catalog])
  const modules = useMemo(() => {
    const extra = Object.keys(moduleIndex).filter((m) => !MODULE_ORDER.includes(m) && !PLANT_MODULE_ORDER.includes(m))
    return [...MODULE_ORDER, ...extra]
  }, [moduleIndex])
  // Plant modules (Microbial, Nano, ...) — same generic cell mechanics as
  // every other module above; rendered in their own table section purely
  // for readability, not because they behave any differently.
  const plantModules = useMemo(() => PLANT_MODULE_ORDER.filter((m) => moduleIndex[m]), [moduleIndex])
  const allModules = useMemo(() => [...modules, ...plantModules], [modules, plantModules])

  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const setRolePermissions = useSetRolePermissions()
  const saving = createRole.isPending || updateRole.isPending || setRolePermissions.isPending

  const goBack = () => navigate('/user-roles')

  const toggle = (module, coarse) => {
    const { perms, checked } = cellState(moduleIndex, module, coarse, selectedKeys)
    setSelectedKeys((prev) => toggleCell(prev, perms, !checked))
  }

  const toggleRow = (module, nextChecked) => {
    setSelectedKeys((prev) => {
      let next = prev
      for (const { key: coarse } of COARSE_ACTIONS) {
        const { perms } = cellState(moduleIndex, module, coarse, next)
        next = toggleCell(next, perms, nextChecked)
      }
      return next
    })
  }

  const toggleColumn = (coarse, nextChecked) => {
    setSelectedKeys((prev) => {
      let next = prev
      for (const module of allModules) {
        const { perms } = cellState(moduleIndex, module, coarse, next)
        next = toggleCell(next, perms, nextChecked)
      }
      return next
    })
  }

  const locked = !!existingRole?.isSystem

  const save = async () => {
    if (!name.trim()) { setMsg('Role name is required'); return }
    setMsg('')
    try {
      if (editing) {
        // Description stays editable even for system roles — only the name
        // itself is locked (input above stays disabled for system roles, so
        // `name` here is always its unchanged original value regardless).
        await updateRole.mutateAsync({ roleId, data: { name, description } })
        await setRolePermissions.mutateAsync({ roleId, permissionKeys: [...selectedKeys] })
      } else {
        await createRole.mutateAsync({ name, description, permissionKeys: [...selectedKeys] })
      }
      goBack()
    } catch (e) { setMsg(e.message) }
  }

  if ((editing && (loadingRoles || !existingRole)) || selectedKeys === null) {
    return (
      <div className="flex flex-col h-full">
        <PageHeader icon={ShieldCheck} title="Edit Role" actions={<BackButton onClick={goBack} />} />
        <div className="p-6 text-sm text-gray-400">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={ShieldCheck}
        title={editing ? 'Edit Role' : 'New Role'}
        description="Check a cell to grant that module's operation; check a row/column heading to toggle the whole line."
        actions={<BackButton onClick={goBack} />}
      />

      <div className="p-6 space-y-4">
        {msg && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-xs max-w-3xl">{msg}</div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={LABEL}>
                Role Name * {locked && <span className="inline-flex items-center gap-1 text-gray-400 font-normal"><Lock size={10} /> locked (system role)</span>}
              </label>
              <input value={name} disabled={locked} onChange={e => setName(e.target.value)} className={FIELD} placeholder="e.g. Store Executive" />
            </div>
            <div>
              <label className={LABEL}>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} className={FIELD} placeholder="What this role is for" />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-gray-600" style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
                  <th className="text-left px-4 py-2.5 font-semibold whitespace-nowrap">Module</th>
                  {COARSE_ACTIONS.map(({ key, label }) => (
                    <th key={key} className="px-3 py-2.5 font-semibold text-center whitespace-nowrap">
                      <button type="button" onClick={() => toggleColumn(key, true)} onDoubleClick={() => toggleColumn(key, false)}
                        title="Click: check whole column · Double-click: clear it" className="hover:underline">
                        {label}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {modules.map((module, i) => (
                  <tr key={module} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-4 py-2 font-semibold text-gray-700 whitespace-nowrap">
                      <button type="button" onClick={() => toggleRow(module, true)} onDoubleClick={() => toggleRow(module, false)}
                        title="Click: check whole row · Double-click: clear it" className="hover:underline text-left">
                        {ALL_LABELS[module] || module}
                      </button>
                    </td>
                    {COARSE_ACTIONS.map(({ key: coarse }) => {
                      const state = cellState(moduleIndex, module, coarse, selectedKeys)
                      return (
                        <td key={coarse} className="px-3 py-2 text-center">
                          <Checkbox checked={state.checked} indeterminate={state.indeterminate} disabled={state.disabled}
                            onChange={() => toggle(module, coarse)} />
                        </td>
                      )
                    })}
                  </tr>
                ))}

                {/* Plant modules — a thin divider for readability only; the
                    rows below are otherwise identical to every module above
                    (same cellState/toggle mechanics, independent Read/
                    Write/Update/Delete/Export per plant). */}
                {plantModules.length > 0 && (
                  <tr>
                    <td colSpan={COARSE_ACTIONS.length + 1} className="px-4 py-1.5 bg-gray-100 text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                      Plant modules
                    </td>
                  </tr>
                )}
                {plantModules.map((module, i) => (
                  <tr key={module} className={`border-b border-gray-100 ${i % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                    <td className="px-4 py-2 font-semibold text-gray-700 whitespace-nowrap">
                      <button type="button" onClick={() => toggleRow(module, true)} onDoubleClick={() => toggleRow(module, false)}
                        title="Click: check whole row · Double-click: clear it" className="hover:underline text-left">
                        {ALL_LABELS[module] || module}
                      </button>
                    </td>
                    {COARSE_ACTIONS.map(({ key: coarse }) => {
                      const state = cellState(moduleIndex, module, coarse, selectedKeys)
                      return (
                        <td key={coarse} className="px-3 py-2 text-center">
                          <Checkbox checked={state.checked} indeterminate={state.indeterminate} disabled={state.disabled}
                            onChange={() => toggle(module, coarse)} />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-[11px] text-gray-400">
          Greyed-out cells have no matching permission in the catalog yet — some modules (QC, Export/Reports) are reserved for features not built yet.
          Plant modules work exactly like every other module above — grant Read/Write/Update/Delete/Export independently per plant. Which plant instances a given login can actually reach is still set (and can be overridden) on that user's own Users page entry.
        </p>

        <div className="flex items-center justify-between max-w-3xl pt-2">
          <span className="text-xs text-gray-400">{selectedKeys.size} permission{selectedKeys.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={goBack}>Cancel</Button>
            <Can anyOf={['admin.roles.create', 'admin.roles.update']}>
              <Button variant="primary" loading={saving} onClick={save}>{editing ? 'Save Changes' : 'Create Role'}</Button>
            </Can>
          </div>
        </div>
      </div>
    </div>
  )
}
