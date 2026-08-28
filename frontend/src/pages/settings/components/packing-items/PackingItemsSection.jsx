import { useState, useMemo } from 'react'
import { Plus, Pencil, Search, Check, X, ArrowLeft } from 'lucide-react'
import { Button, IconButton, Loading } from '../../../../components/ui'
import {
  usePackingItemsAdmin,
  useCreatePackingItem,
  useUpdatePackingItem,
  useSetPackingItemActive,
} from '../../../../hooks/usePackingItemsAdmin.js'

const TYPE_LABEL = { PRIMARY: 'Primary', SECONDARY: 'Secondary' }
const TYPE_PILL = {
  PRIMARY: 'bg-blue-100 text-blue-700',
  SECONDARY: 'bg-purple-100 text-purple-700',
}

// Settings > Packing Items — the curated list of pack descriptions suggested
// on the Sales Order Primary/Secondary Pack fields. Mirrors the Select
// Options management pattern (see components/options/OptionGroupDetail.jsx):
// add / inline-edit / activate-deactivate, no hard delete.
export default function PackingItemsSection({ onBack }) {
  const { data: items = [], isLoading } = usePackingItemsAdmin()
  const createItem = useCreatePackingItem()
  const updateItem = useUpdatePackingItem()
  const setActive = useSetPackingItemActive()

  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [newType, setNewType] = useState('PRIMARY')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName] = useState('')
  const [editCode, setEditCode] = useState('')
  const [editType, setEditType] = useState('PRIMARY')
  const [err, setErr] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return items.filter(v => {
      if (typeFilter !== 'ALL' && v.type !== typeFilter) return false
      if (!q) return true
      return v.name.toLowerCase().includes(q) || v.itemCode.toLowerCase().includes(q)
    })
  }, [items, search, typeFilter])

  async function handleAdd() {
    if (!newName.trim() || !newCode.trim()) { setErr('Name and item code are both required'); return }
    setErr('')
    try {
      await createItem.mutateAsync({ name: newName.trim(), itemCode: newCode.trim(), type: newType })
      setNewName(''); setNewCode(''); setNewType('PRIMARY'); setAdding(false)
    } catch (e) { setErr(e.message) }
  }

  function startEdit(v) {
    setEditingId(v.id); setEditName(v.name); setEditCode(v.itemCode); setEditType(v.type); setErr('')
  }

  async function saveEdit() {
    if (!editName.trim() || !editCode.trim()) { setErr('Name and item code are both required'); return }
    setErr('')
    try {
      await updateItem.mutateAsync({ id: editingId, data: { name: editName.trim(), itemCode: editCode.trim(), type: editType } })
      setEditingId(null)
    } catch (e) { setErr(e.message) }
  }

  async function toggleActive(v) {
    setErr('')
    try { await setActive.mutateAsync({ id: v.id, isActive: !v.isActive }) }
    catch (e) { setErr(e.message) }
  }

  return (
    <div className="max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-100">
          {onBack && <IconButton icon={ArrowLeft} variant="outline-gray" size="sm" tooltip="Back to groups" onClick={onBack} />}
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-gray-900">Packing Items</h2>
            <p className="text-xs text-gray-500 truncate">
              Suggestions for the Sales Order Primary / Secondary Pack fields · {items.length} item{items.length === 1 ? '' : 's'}
            </p>
          </div>
          <Button variant="primary" size="sm" icon={Plus} className="ml-auto" onClick={() => setAdding(a => !a)}>
            Add Packing Item
          </Button>
        </div>

        {adding && (
          <div className="flex items-end gap-2 px-5 py-3 bg-blue-50/50 border-b border-gray-100 flex-wrap">
            <div className="flex-[2] min-w-[160px]">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Name</label>
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. HDPE Jar with Cap- 1 kg"
                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex-1 min-w-[110px]">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Item Code</label>
              <input value={newCode} onChange={e => setNewCode(e.target.value)} placeholder="e.g. PK-001"
                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-2.5 py-1.5 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="min-w-[120px]">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide block mb-1">Type</label>
              <select value={newType} onChange={e => setNewType(e.target.value)}
                className="w-full border border-gray-300 bg-white text-gray-900 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="PRIMARY">Primary</option>
                <option value="SECONDARY">Secondary</option>
              </select>
            </div>
            <Button variant="primary" size="sm" onClick={handleAdd} loading={createItem.isPending}>Save</Button>
            <Button variant="outline-gray" size="sm" onClick={() => { setAdding(false); setErr('') }}>Cancel</Button>
          </div>
        )}

        {err && <div className="px-5 py-2 text-xs text-red-600 bg-red-50 border-b border-red-100">{err}</div>}

        <div className="flex items-center gap-2 px-5 py-3 border-b border-gray-100 flex-wrap">
          <div className="relative max-w-xs flex-1 min-w-[160px]">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or code…"
              className="w-full border border-gray-200 bg-white text-gray-900 rounded-lg pl-8 pr-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="flex gap-1">
            {['ALL', 'PRIMARY', 'SECONDARY'].map(t => (
              <button key={t} type="button" onClick={() => setTypeFilter(t)}
                className={[
                  'text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors',
                  typeFilter === t ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                ].join(' ')}>
                {t === 'ALL' ? 'All' : TYPE_LABEL[t]}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No packing items found.</div>
            ) : filtered.map((v) => {
              const editing = editingId === v.id
              return (
                <div key={v.id} className={`flex items-center gap-3 px-5 py-2.5 ${!v.isActive ? 'opacity-50' : ''}`}>
                  {editing ? (
                    <div className="flex-1 flex items-center gap-2 flex-wrap">
                      <input value={editName} onChange={e => setEditName(e.target.value)}
                        className="flex-[2] min-w-[140px] border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                      <input value={editCode} onChange={e => setEditCode(e.target.value)}
                        className="w-28 border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500" />
                      <select value={editType} onChange={e => setEditType(e.target.value)}
                        className="border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="PRIMARY">Primary</option>
                        <option value="SECONDARY">Secondary</option>
                      </select>
                      <IconButton icon={Check} variant="secondary" size="xs" tooltip="Save" onClick={saveEdit} />
                      <IconButton icon={X} variant="ghost" size="xs" tooltip="Cancel" onClick={() => setEditingId(null)} />
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_PILL[v.type] || 'bg-gray-100 text-gray-500'}`}>
                        {TYPE_LABEL[v.type] || v.type}
                      </span>
                      <span className="text-sm text-gray-900 truncate">{v.name}</span>
                      <span className="text-[11px] font-mono text-gray-400 shrink-0">{v.itemCode}</span>
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
        )}
      </div>
    </div>
  )
}
