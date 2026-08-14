import { useState, useMemo } from 'react'
import { ArrowLeft, ArrowUp, ArrowDown, Plus, Pencil, Search, Check, X } from 'lucide-react'
import { Button, IconButton, Loading } from '../../../../components/ui'
import { useOptionGroup, useCreateOptionValue, useUpdateOptionValue, useSetOptionActive, useReorderOptionValues } from '../../../../hooks/useOptionsAdmin.js'

export default function OptionGroupDetail({ groupCode, onBack }) {
  const { data: group, isLoading } = useOptionGroup(groupCode)
  const createValue = useCreateOptionValue()
  const updateValue = useUpdateOptionValue()
  const setActive = useSetOptionActive()
  const reorder = useReorderOptionValues()

  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editCode, setEditCode] = useState('')
  const [editLabel, setEditLabel] = useState('')
  const [err, setErr] = useState('')

  const values = group?.values ?? []
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return values
    return values.filter(v => v.label.toLowerCase().includes(q) || v.code.toLowerCase().includes(q))
  }, [values, search])

  async function handleAdd() {
    if (!newCode.trim() || !newLabel.trim()) { setErr('Code and label are both required'); return }
    setErr('')
    try {
      await createValue.mutateAsync({ groupCode, data: { code: newCode.trim(), label: newLabel.trim() } })
      setNewCode(''); setNewLabel(''); setAdding(false)
    } catch (e) { setErr(e.message) }
  }

  function startEdit(v) {
    setEditingId(v.id); setEditCode(v.code); setEditLabel(v.label); setErr('')
  }

  async function saveEdit() {
    if (!editCode.trim() || !editLabel.trim()) { setErr('Code and label are both required'); return }
    setErr('')
    try {
      await updateValue.mutateAsync({ id: editingId, groupCode, data: { code: editCode.trim(), label: editLabel.trim() } })
      setEditingId(null)
    } catch (e) { setErr(e.message) }
  }

  async function toggleActive(v) {
    setErr('')
    try { await setActive.mutateAsync({ id: v.id, groupCode, isActive: !v.isActive }) }
    catch (e) { setErr(e.message) }
  }

  async function move(idx, dir) {
    const target = idx + dir
    if (target < 0 || target >= values.length) return
    const reordered = [...values]
    ;[reordered[idx], reordered[target]] = [reordered[target], reordered[idx]]
    const order = reordered.map((v, i) => ({ code: v.code, sortOrder: i }))
    setErr('')
    try { await reorder.mutateAsync({ groupCode, order }) }
    catch (e) { setErr(e.message) }
  }

  if (isLoading) return <Loading />
  if (!group) return <div className="text-sm text-gray-500">Group not found.</div>

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden max-w-3xl">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
        <IconButton icon={ArrowLeft} variant="outline-gray" size="sm" tooltip="Back to groups" onClick={onBack} />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">{group.label}</h2>
          {group.description && <p className="text-xs text-gray-500 truncate">{group.description}</p>}
        </div>
        <Button variant="primary" size="sm" icon={Plus} className="ml-auto" onClick={() => setAdding(a => !a)}>
          Add Option
        </Button>
      </div>

      {adding && (
        <div className="flex items-end gap-2 px-5 py-3 bg-blue-50/50 border-b border-gray-100">
          <div className="flex-1">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Code</label>
            <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. SOM"
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex-[2]">
            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Label</label>
            <input value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="e.g. SOM Phytopharma"
              className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Button variant="primary" size="sm" onClick={handleAdd} loading={createValue.isPending}>Save</Button>
          <Button variant="outline-gray" size="sm" onClick={() => { setAdding(false); setErr('') }}>Cancel</Button>
        </div>
      )}

      {err && <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{err}</div>}

      <div className="px-5 py-3 border-b border-gray-100">
        <div className="relative max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search options…"
            className="w-full border border-gray-200 bg-white text-gray-900 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">No options found.</div>
        ) : filtered.map((v) => {
          const idx = values.findIndex(x => x.id === v.id)
          const editing = editingId === v.id
          return (
            <div key={v.id} className={`flex items-center gap-3 px-5 py-2.5 ${!v.isActive ? 'opacity-50' : ''}`}>
              <div className="flex flex-col gap-0.5 shrink-0">
                <IconButton icon={ArrowUp} variant="ghost" size="xs" tooltip="Move up" disabled={idx === 0} onClick={() => move(idx, -1)} />
                <IconButton icon={ArrowDown} variant="ghost" size="xs" tooltip="Move down" disabled={idx === values.length - 1} onClick={() => move(idx, 1)} />
              </div>

              {editing ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={editCode} onChange={e => setEditCode(e.target.value)}
                    className="w-28 border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500" />
                  <input value={editLabel} onChange={e => setEditLabel(e.target.value)}
                    className="flex-1 border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  <IconButton icon={Check} variant="secondary" size="xs" tooltip="Save" onClick={saveEdit} />
                  <IconButton icon={X} variant="ghost" size="xs" tooltip="Cancel" onClick={() => setEditingId(null)} />
                </div>
              ) : (
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className="text-sm text-gray-900 truncate">{v.label}</span>
                  <span className="text-[11px] font-mono text-gray-400 shrink-0">{v.code}</span>
                </div>
              )}

              {!editing && (
                <>
                  <IconButton icon={Pencil} variant="ghost" size="xs" tooltip="Edit" onClick={() => startEdit(v)} />
                  <button
                    type="button"
                    onClick={() => toggleActive(v)}
                    className={[
                      'shrink-0 text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors',
                      v.isActive
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                    ].join(' ')}
                  >
                    {v.isActive ? 'Active' : 'Inactive'}
                  </button>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
