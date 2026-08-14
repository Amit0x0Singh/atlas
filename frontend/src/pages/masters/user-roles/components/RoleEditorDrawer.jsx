import { useState, useMemo } from 'react'
import { X, ShieldCheck, Lock } from 'lucide-react'
import { Button, IconButton } from '../../../../components/ui'
import { MODULE_ORDER, MODULE_LABELS, COARSE_ACTIONS, buildModuleIndex, cellState, toggleCell } from '../../../../constants/permissionMatrix.js'

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

/**
 * Wide (landscape), not tall — the matrix has 9 rows × 5 columns and reads
 * far better across than in a narrow stacked layout.
 */
export default function RoleEditorDrawer({ editing, catalog, saving, msg, onSave, onClose }) {
  const [name, setName]               = useState(editing?.name || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [selectedKeys, setSelectedKeys] = useState(
    () => new Set((editing?.permissions || []).map((rp) => rp.permission.key))
  )

  const moduleIndex = useMemo(() => buildModuleIndex(catalog), [catalog])
  const modules = useMemo(() => {
    const extra = Object.keys(moduleIndex).filter((m) => !MODULE_ORDER.includes(m))
    return [...MODULE_ORDER, ...extra]
  }, [moduleIndex])

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
      for (const module of modules) {
        const { perms } = cellState(moduleIndex, module, coarse, next)
        next = toggleCell(next, perms, nextChecked)
      }
      return next
    })
  }

  const handleSave = () => onSave({ name, description, permissionKeys: [...selectedKeys] })

  const locked = !!editing?.isSystem

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-gray-100 shrink-0 bg-gradient-to-br from-violet-50/80 to-white rounded-t-2xl">
          <div className="flex items-start gap-3 min-w-0">
            <span className="shrink-0 w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-sm shadow-violet-200">
              <ShieldCheck size={16} />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-gray-900">{editing ? 'Edit Role' : 'New Role'}</h2>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Check a cell to grant that module's operation; check a row/column heading to toggle the whole line.
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
                  <tr className="bg-slate-700 text-white">
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
                          {MODULE_LABELS[module] || module}
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
          </p>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 shrink-0 bg-white rounded-b-2xl">
          <span className="text-xs text-gray-400">{selectedKeys.size} permission{selectedKeys.size !== 1 ? 's' : ''} selected</span>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={saving} onClick={handleSave}>{editing ? 'Save Changes' : 'Create Role'}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
