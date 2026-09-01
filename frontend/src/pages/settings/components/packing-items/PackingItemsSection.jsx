import { useState, useMemo } from 'react'
import { Plus, Pencil, Search, Check, X, ArrowLeft, Filter, ArrowUpDown } from 'lucide-react'
import { Button, IconButton, Loading } from '../../../../components/ui'
import Pagination from '../../../../components/pagination/Pagination.jsx'
import PackingItemsFilterModal, { EMPTY_PACKING_FILTERS } from './PackingItemsFilterModal.jsx'
import PackingItemsSortModal, { DEFAULT_PACKING_SORT } from './PackingItemsSortModal.jsx'
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

function countActiveFilters(f) {
  return (f.type !== 'ALL' ? 1 : 0) + (f.status !== 'ALL' ? 1 : 0)
}

// Settings > Packing Items — the curated list of pack descriptions suggested
// on the Sales Order Primary/Secondary Pack fields. Mirrors the Select
// Options management pattern (add / inline-edit / activate-deactivate, no
// hard delete) but with the standard master-table chrome: search + Filter +
// Sort by toolbar and client-side pagination (see SupplierTable.jsx).
export default function PackingItemsSection({ onBack }) {
  const { data: items = [], isLoading } = usePackingItemsAdmin()
  const createItem = useCreatePackingItem()
  const updateItem = useUpdatePackingItem()
  const setActive = useSetPackingItemActive()

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_PACKING_FILTERS)
  const [sort, setSort] = useState(DEFAULT_PACKING_SORT)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(15)
  const [showFilter, setShowFilter] = useState(false)
  const [showSort, setShowSort] = useState(false)

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
    let list = items.filter(v => {
      if (filters.type !== 'ALL' && v.type !== filters.type) return false
      if (filters.status === 'ACTIVE' && !v.isActive) return false
      if (filters.status === 'INACTIVE' && v.isActive) return false
      if (!q) return true
      return v.name.toLowerCase().includes(q) || v.itemCode.toLowerCase().includes(q)
    })

    const dir = sort.direction === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sort.field === 'itemCode') return dir * (a.itemCode || '').localeCompare(b.itemCode || '')
      if (sort.field === 'type') return dir * (a.type || '').localeCompare(b.type || '')
      if (sort.field === 'createdAt') return dir * (new Date(a.createdAt) - new Date(b.createdAt))
      return dir * (a.name || '').localeCompare(b.name || '') // 'name'
    })
    return list
  }, [items, search, filters, sort])

  const total = filtered.length
  const pageRows = filtered.slice((page - 1) * limit, page * limit)
  const activeFilterCount = countActiveFilters(filters)
  const sortIsDefault = sort.field === DEFAULT_PACKING_SORT.field && sort.direction === DEFAULT_PACKING_SORT.direction

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
    <div className="max-w-4xl">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
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

        {/* ── Toolbar: search + count + Sort by + Filter ─────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search name or code…"
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-[13px] text-gray-900 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            />
          </div>

          <span className="text-[11px] text-gray-400 font-medium whitespace-nowrap px-1 hidden sm:inline">
            {total} {total === 1 ? 'item' : 'items'}
          </span>

          <div className="flex items-center gap-2 ml-auto">
            <Button variant={sortIsDefault ? 'outline-gray' : 'outline'} size="sm" icon={ArrowUpDown} onClick={() => setShowSort(true)}>
              Sort by
            </Button>
            <Button variant={activeFilterCount ? 'outline' : 'outline-gray'} size="sm" icon={Filter} onClick={() => setShowFilter(true)}>
              Filter{activeFilterCount > 0 && ` (${activeFilterCount})`}
            </Button>
          </div>
        </div>

        {isLoading ? (
          <Loading />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
              <thead style={{ backgroundColor: 'rgb(226, 235, 240)' }}>
                <tr className="text-gray-600 text-xs">
                  <th className="text-left px-5 py-3 font-semibold whitespace-nowrap" style={{ width: 110 }}>Type</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap">Name</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ width: 130 }}>Item Code</th>
                  <th className="text-left px-4 py-3 font-semibold whitespace-nowrap" style={{ width: 100 }}>Status</th>
                  <th className="text-right px-5 py-3 font-semibold whitespace-nowrap" style={{ width: 70 }}>Edit</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-gray-400">No packing items found.</td>
                  </tr>
                ) : pageRows.map(v => {
                  const editing = editingId === v.id
                  if (editing) {
                    return (
                      <tr key={v.id} className="border-b border-gray-100 bg-blue-50/40">
                        <td className="px-5 py-2" colSpan={4}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <input value={editName} onChange={e => setEditName(e.target.value)}
                              className="flex-[2] min-w-[160px] border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                            <input value={editCode} onChange={e => setEditCode(e.target.value)}
                              className="w-28 border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-xs font-mono outline-none focus:ring-2 focus:ring-blue-500" />
                            <select value={editType} onChange={e => setEditType(e.target.value)}
                              className="border border-gray-300 bg-white text-gray-900 rounded-lg px-2 py-1 text-xs outline-none focus:ring-2 focus:ring-blue-500">
                              <option value="PRIMARY">Primary</option>
                              <option value="SECONDARY">Secondary</option>
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-2">
                          <div className="flex items-center justify-end gap-1">
                            <IconButton icon={Check} variant="secondary" size="xs" tooltip="Save" onClick={saveEdit} />
                            <IconButton icon={X} variant="ghost" size="xs" tooltip="Cancel" onClick={() => setEditingId(null)} />
                          </div>
                        </td>
                      </tr>
                    )
                  }
                  return (
                    <tr key={v.id} className={`border-b border-gray-100 hover:bg-gray-50 ${!v.isActive ? 'opacity-55' : ''}`}>
                      <td className="px-5 py-2.5">
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${TYPE_PILL[v.type] || 'bg-gray-100 text-gray-500'}`}>
                          {TYPE_LABEL[v.type] || v.type}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-gray-900 truncate">{v.name}</td>
                      <td className="px-4 py-2.5 text-[12px] font-mono text-gray-500 whitespace-nowrap">{v.itemCode}</td>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          onClick={() => toggleActive(v)}
                          className={[
                            'text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors',
                            v.isActive
                              ? 'bg-green-100 text-green-700 hover:bg-green-200'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200',
                          ].join(' ')}
                        >
                          {v.isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <IconButton icon={Pencil} variant="ghost" size="xs" tooltip="Edit" onClick={() => startEdit(v)} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {!isLoading && total > 0 && (
          <div className="px-5 pb-3">
            <Pagination page={page} total={total} limit={limit} onChange={setPage} onLimitChange={l => { setLimit(l); setPage(1) }} />
          </div>
        )}
      </div>

      <PackingItemsFilterModal
        open={showFilter}
        onClose={() => setShowFilter(false)}
        value={filters}
        onApply={f => { setFilters(f); setPage(1) }}
      />
      <PackingItemsSortModal
        open={showSort}
        onClose={() => setShowSort(false)}
        value={sort}
        onApply={setSort}
      />
    </div>
  )
}
