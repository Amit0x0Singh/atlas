import { useEffect, useState } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import EquipmentTable from '../components/equipment-table/EquipmentTable.jsx'
import EquipmentForm from '../components/equipment-form/EquipmentForm.jsx'
import EquipmentDetailModal from '../components/equipment-detail-modal/EquipmentDetailModal.jsx'
import { EMPTY_EQUIPMENT_FILTERS, DEFAULT_EQUIPMENT_SORT } from '../components/equipment-table/EquipmentToolbar.jsx'
import { useEquipment, useEquipmentFilterMeta, useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from '../../../../hooks/masters/useEquipment.js'
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'
import { equipmentApi } from '../../../../api/masters.js'

export default function EquipmentMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [viewing, setViewing]  = useState(null)
  const [form, setForm]        = useState({ equipName: '', plant: '' })
  const [msg, setMsg]          = useState('')
  const [search, setSearch]    = useState('')
  const [filters, setFilters]  = useState(EMPTY_EQUIPMENT_FILTERS)
  const [sort, setSort]        = useState(DEFAULT_EQUIPMENT_SORT)
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)
  const [exporting, setExporting] = useState(false)

  // `search` maps to the backend's `equipName` param — the toolbar's single
  // search box is this table's primary quick filter.
  const debouncedFilters = useDebouncedValue({ ...filters, equipName: search }, 300)
  useEffect(() => { setPage(1) }, [debouncedFilters])

  const { data: result, isLoading: loading, error: equipmentError } = useEquipment({ ...debouncedFilters, page, limit })
  const items = result?.items ?? []
  const total = result?.total ?? 0
  const error = equipmentError?.message || ''

  const { data: meta } = useEquipmentFilterMeta()
  const operationOptions = (meta?.operations || []).map(o => ({ value: o, label: o }))
  const plantOptions     = (meta?.plants || []).map(p => ({ value: p, label: p }))

  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()
  const deleteEquipment = useDeleteEquipment()

  // Fetches every row matching the current filters (omitting page/limit —
  // the backend treats that as "give me everything", see equipment-master.
  // controller.js) rather than exporting just the page on screen.
  async function exportEquipmentCsv() {
    setExporting(true)
    try {
      const r = await equipmentApi.list(debouncedFilters)
      const all = r.data || []
      if (!all.length) { alert('No equipment to export — adjust your filters.'); return }
      const headers = ['Equip Code', 'Equipment Name', 'Working Volume', 'Working Unit', 'Operation', 'Plant']
      const rows = all.map(it => [
        it.equipCode, toTitleCase(it.equipName), it.workingVolume ?? 0, it.workingUnit || '', it.operation || '', it.plant || '',
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = `equipment_master_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      alert(e.message)
    } finally {
      setExporting(false)
    }
  }

  const openAdd  = () => { setEditing(null); setForm({ equipName: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => { setEditing(item); setForm({ equipName: toTitleCase(item.equipName), plant: item.plant }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.equipName) { setMsg('Equipment name is required'); return }
    setMsg('')
    try {
      if (editing) await updateEquipment.mutateAsync({ id: editing.equipId, data: form })
      else await createEquipment.mutateAsync(form)
      setShowForm(false)
    } catch (e) { setMsg(e.message) }
  }

  const del = async (id, name) => {
    if (!confirm(`Delete equipment "${toTitleCase(name)}"?`)) return
    try { await deleteEquipment.mutateAsync(id) } catch (e) { alert(e.message) }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Wrench}
        title="Equipment Master"
        description="Manage production equipment for indent selection"
        actions={<>
          <Can permission="masters.equipment.create">
            <Button variant="warning" icon={Plus} onClick={openAdd}>Add Equipment</Button>
          </Can>
          <BackButton />
        </>}
      />

      <div className="p-6">
      <EquipmentTable
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        operationOptions={operationOptions}
        plantOptions={plantOptions}
        onExport={exportEquipmentCsv}
        exporting={exporting}
        items={items}
        total={total}
        loading={loading}
        error={error}
        page={page}
        limit={limit}
        onEdit={openEdit}
        onDelete={del}
        onRowClick={setViewing}
        onPageChange={setPage}
        onLimitChange={l => { setLimit(l); setPage(1) }}
      />

      {showForm && (
        <EquipmentForm
          editing={editing}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={createEquipment.isPending || updateEquipment.isPending}
          msg={msg}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}

      <EquipmentDetailModal item={viewing} onClose={() => setViewing(null)} />
      </div>
    </div>
  )
}
