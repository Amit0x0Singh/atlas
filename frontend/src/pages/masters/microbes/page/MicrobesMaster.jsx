import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Upload, Plus } from 'lucide-react'
import { Button, BackButton } from '../../../../components/ui'
import MicrobeList   from '../components/microbe-list/MicrobeList.jsx'
import MicrobeForm   from '../components/microbe-form/MicrobeForm.jsx'
import MicrobeImport from '../components/microbe-import/MicrobeImport.jsx'
import { useMicrobes, useCreateMicrobe, useUpdateMicrobe, useDeleteMicrobe } from '../../../../hooks/masters/useMicrobes.js'
import { queryKeys } from '../../../../lib/queryKeys.js'

const S = {
  page:       { padding: '24px', fontFamily: "'Inter',system-ui,sans-serif", maxWidth: '960px' },
  head:       { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' },
  h1:         { fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 },
  sub:        { fontSize: '13px', color: '#64748b', marginTop: '4px' },
}

export default function MicrobesMaster() {
  const [tab, setTab]           = useState('list')
  const [form, setForm]         = useState({ microbe_name: '', microbe_code: '' })
  const [editId, setEditId]     = useState(null)
  const [search, setSearch]     = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  const qc = useQueryClient()
  const { data: microbes = [], isLoading: loading } = useMicrobes()
  const createMicrobe = useCreateMicrobe()
  const updateMicrobe = useUpdateMicrobe()
  const deleteMicrobe = useDeleteMicrobe()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editId) await updateMicrobe.mutateAsync({ id: editId, data: form })
      else        await createMicrobe.mutateAsync(form)
      setForm({ microbe_name: '', microbe_code: '' })
      setEditId(null)
      setTab('list')
    } catch (err) { alert(err.message) }
  }

  const handleEdit = (m) => {
    setForm({ microbe_name: m.microbe_name, microbe_code: m.microbe_code })
    setEditId(m.microbe_id)
    setTab('add')
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete "${name}"?`)) return
    await deleteMicrobe.mutateAsync(id)
  }

  const filtered  = microbes.filter(m =>
    m.microbe_name.toLowerCase().includes(search.toLowerCase()) ||
    m.microbe_code.toLowerCase().includes(search.toLowerCase())
  )
  const paginated = filtered.slice((page - 1) * limit, page * limit)

  return (
    <div style={S.page}>
      {/* Header */}
      <div style={S.head}>
        <div>
          <h1 style={S.h1}>🦠 Microbes Master</h1>
          <p style={S.sub}>Manage microbe names and codes used across the SFG module</p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Button variant="outline" icon={Upload} onClick={() => setTab('import')}>Import Excel</Button>
          <Button variant="primary" icon={Plus} onClick={() => { setForm({ microbe_name: '', microbe_code: '' }); setEditId(null); setTab('add') }}>
            Add Microbe
          </Button>
          <BackButton />
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
        {[
          ['list',   '📋 Microbe List'],
          ['add',    editId ? '✏️ Edit Microbe' : '+ Add Microbe'],
          ['import', '⇪ Import from Excel'],
        ].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            padding: '8px 18px', borderRadius: '8px 8px 0 0', fontSize: '13px', fontWeight: 600,
            border: '1px solid #e2e8f0', borderBottom: tab === k ? '2px solid #1e3a5f' : '1px solid #e2e8f0',
            background: tab === k ? '#fff' : '#f8fafc', color: tab === k ? '#1e3a5f' : '#64748b', cursor: 'pointer',
          }}>{l}</button>
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
          onCancel={() => { setTab('list'); setEditId(null); setForm({ microbe_name: '', microbe_code: '' }) }}
        />
      )}

      {tab === 'import' && (
        <MicrobeImport onImportDone={() => qc.invalidateQueries({ queryKey: queryKeys.microbes.all() })} />
      )}
    </div>
  )
}
