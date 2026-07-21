import { useState, useMemo } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, Plus, Microscope } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import MicrobeList   from '../components/microbe-list/MicrobeList.jsx'
import MicrobeForm   from '../components/microbe-form/MicrobeForm.jsx'
import MicrobeImport from '../components/microbe-import/MicrobeImport.jsx'
import { useMicrobes, useCreateMicrobe, useUpdateMicrobe, useDeleteMicrobe } from '../../../../hooks/masters/useMicrobes.js'
import { useMicrobialContainers } from '../../../../hooks/masters/useMicrobialContainers.js'
import { queryKeys } from '../../../../lib/queryKeys.js'

const EMPTY_FORM = { microbe_name: '', uom: 'KG' }

export default function MicrobesMaster() {
  const [tab, setTab]           = useState('list')
  const [form, setForm]         = useState(EMPTY_FORM)
  const [editId, setEditId]     = useState(null)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  const qc = useQueryClient()
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
      setTab('list')
    } catch (err) { alert(err.message) }
  }

  const handleEdit = (m) => {
    setForm({ microbe_name: m.microbeName, microbe_code: m.microbeCode, uom: m.uom || 'KG' })
    setEditId(m.microbeId)
    setTab('add')
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    try { await deleteMicrobe.mutateAsync(id) } catch (err) { alert(err.message) }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return microbes.filter(m =>
      m.microbeName.toLowerCase().includes(q) || m.microbeCode.toLowerCase().includes(q)
    )
  }, [microbes, search])
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Microscope}
        title="Microbes Master"
        description="Manage microbe names and codes used across the SFG module"
        actions={<>
          <Button variant="outline" icon={Upload} onClick={() => setTab('import')}>Import Excel</Button>
          <Button variant="primary" icon={Plus} onClick={() => { setForm(EMPTY_FORM); setEditId(null); setTab('add') }}>
            Add Microbe
          </Button>
          <BackButton />
        </>}
      />

      <div className="p-6 max-w-4xl">
        <div className="flex gap-1 mb-5 border-b border-gray-200">
          {[
            ['list', 'Microbe List'],
            ['add', editId ? 'Edit Microbe' : 'Add Microbe'],
            ['import', 'Import from Excel'],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === k ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === 'list' && (
          <MicrobeList
            paginated={paginated}
            total={filtered.length}
            loading={loading}
            search={search}
            page={page}
            limit={limit}
            hasStock={hasStock}
            onSearch={v => { setSearch(v); setPage(1) }}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onPageChange={setPage}
            onLimitChange={l => { setLimit(l); setPage(1) }}
          />
        )}

        {tab === 'add' && (
          <MicrobeForm
            editId={editId}
            form={form}
            onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
            saving={createMicrobe.isPending || updateMicrobe.isPending}
            onSubmit={handleSubmit}
            onCancel={() => { setTab('list'); setEditId(null); setForm(EMPTY_FORM) }}
          />
        )}

        {tab === 'import' && (
          <MicrobeImport onImportDone={() => qc.invalidateQueries({ queryKey: queryKeys.microbes.all() })} />
        )}
      </div>
    </div>
  )
}
