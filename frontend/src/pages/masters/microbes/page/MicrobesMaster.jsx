import { useState, useMemo } from 'react'
import { Plus, Microscope } from 'lucide-react'
import { Button, BackButton, PageHeader, Modal } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import MicrobeList   from '../components/microbe-list/MicrobeList.jsx'
import MicrobeForm   from '../components/microbe-form/MicrobeForm.jsx'
import { EMPTY_MICROBE_FILTERS } from '../components/microbe-list/MicrobeFilterModal.jsx'
import { DEFAULT_MICROBE_SORT } from '../components/microbe-list/MicrobeSortModal.jsx'
import { useMicrobes, useCreateMicrobe, useUpdateMicrobe, useDeleteMicrobe } from '../../../../hooks/masters/useMicrobes.js'
import { useMicrobialContainers } from '../../../../hooks/masters/useMicrobialContainers.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'

const EMPTY_FORM = { microbe_name: '', uom: 'KG' }

export default function MicrobesMaster() {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editId, setEditId]     = useState(null)
  const [search, setSearch]     = useState('')
  const [filters, setFilters]   = useState(EMPTY_MICROBE_FILTERS)
  const [sort, setSort]         = useState(DEFAULT_MICROBE_SORT)
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  const { data: microbes = [], isLoading: loading } = useMicrobes()
  const { data: containers = [] } = useMicrobialContainers()
  const createMicrobe = useCreateMicrobe()
  const updateMicrobe = useUpdateMicrobe()
  const deleteMicrobe = useDeleteMicrobe()

  // A microbe "has stock" if any container currently holding it isn't empty
  // — used to block deleting a master row that's actively backing real
  // inventory, instead of silently orphaning those container records.
  const hasStock = (microbeCode) =>
    containers.some(c => c.microbeCode === microbeCode && (c.currentQtyKg || 0) > 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const { microbe_name, uom } = form
      if (editId) await updateMicrobe.mutateAsync({ id: editId, data: { microbe_name, uom } })
      else        await createMicrobe.mutateAsync({ microbe_name, uom })
      setForm(EMPTY_FORM)
      setEditId(null)
      setShowForm(false)
    } catch (err) { alert(err.message) }
  }

  const handleEdit = (m) => {
    setForm({ microbe_name: toTitleCase(m.microbeName), microbe_code: m.microbeCode, uom: m.uom || 'KG' })
    setEditId(m.microbeId)
    setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try { await deleteMicrobe.mutateAsync(id) } catch (err) { alert(err.message) }
  }

  const uoms = useMemo(() =>
    Array.from(new Set(microbes.map(m => m.uom).filter(Boolean))).sort()
  , [microbes])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = microbes.filter(m => {
      if (q && !m.microbeName.toLowerCase().includes(q) && !m.microbeCode.toLowerCase().includes(q)) return false
      if (filters.uom && m.uom !== filters.uom) return false
      if (filters.stock === 'has' && !hasStock(m.microbeCode)) return false
      if (filters.stock === 'no' && hasStock(m.microbeCode)) return false
      const addedDate = m.createdAt?.slice(0, 10) || ''
      if (filters.dateFrom && addedDate < filters.dateFrom) return false
      if (filters.dateTo && addedDate > filters.dateTo) return false
      return true
    })

    const dir = sort.direction === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sort.field === 'code') return dir * (a.microbeCode || '').localeCompare(b.microbeCode || '')
      if (sort.field === 'dateAdded') return dir * (a.createdAt || '').localeCompare(b.createdAt || '')
      if (sort.field === 'stock') return dir * (Number(hasStock(a.microbeCode)) - Number(hasStock(b.microbeCode)))
      return dir * (a.microbeName || '').localeCompare(b.microbeName || '') // 'name'
    })

    return list
  }, [microbes, search, filters, sort, containers])
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  function exportMicrobesCsv() {
    if (!filtered.length) { alert('No microbes to export — adjust your filters.'); return }
    const headers = ['Microbe ID', 'Microbe Name', 'Code', 'UOM', 'Date Added', 'Stock']
    const rows = filtered.map(m => [
      m.microbeId, toTitleCase(m.microbeName), m.microbeCode, (m.uom || '').toUpperCase(),
      m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '',
      hasStock(m.microbeCode) ? 'Has stock' : 'No stock',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `microbes_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Microscope}
        title="Microbes Master"
        description="Manage microbe names and codes used across the SFG module"
        actions={<>
          <Can permission="masters.microbe.create">
            <Button variant="primary" icon={Plus} onClick={() => { setForm(EMPTY_FORM); setEditId(null); setShowForm(true) }}>
              Add Microbe
            </Button>
          </Can>
          <BackButton />
        </>}
      />

      <div className="p-6">
        <MicrobeList
          paginated={paginated}
          total={filtered.length}
          loading={loading}
          search={search}
          filters={filters}
          sort={sort}
          uoms={uoms}
          page={page}
          limit={limit}
          hasStock={hasStock}
          onSearch={v => { setSearch(v); setPage(1) }}
          onFiltersChange={f => { setFilters(f); setPage(1) }}
          onSortChange={setSort}
          onExport={exportMicrobesCsv}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      </div>

      <Modal open={showForm} onClose={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM) }} size="md">
        <MicrobeForm
          editId={editId}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={createMicrobe.isPending || updateMicrobe.isPending}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditId(null); setForm(EMPTY_FORM) }}
        />
      </Modal>
    </div>
  )
}
