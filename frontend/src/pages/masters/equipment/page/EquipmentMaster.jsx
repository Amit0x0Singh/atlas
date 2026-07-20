import { useState } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import EquipmentTable from '../components/equipment-table/EquipmentTable.jsx'
import EquipmentForm from '../components/equipment-form/EquipmentForm.jsx'
import EquipmentDetailModal from '../components/equipment-detail-modal/EquipmentDetailModal.jsx'
import { useEquipment, useCreateEquipment, useUpdateEquipment, useDeleteEquipment } from '../../../../hooks/masters/useEquipment.js'

export default function EquipmentMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [viewing, setViewing]  = useState(null)
  const [form, setForm]        = useState({ equipName: '', plant: '' })
  const [msg, setMsg]          = useState('')
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  const { data: items = [], isLoading: loading } = useEquipment()
  const createEquipment = useCreateEquipment()
  const updateEquipment = useUpdateEquipment()
  const deleteEquipment = useDeleteEquipment()

  const openAdd  = () => { setEditing(null); setForm({ equipName: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => { setEditing(item); setForm({ equipName: item.equipName, plant: item.plant }); setShowForm(true); setMsg('') }

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
    if (!confirm(`Delete equipment "${name}"?`)) return
    try { await deleteEquipment.mutateAsync(id) } catch (e) { alert(e.message) }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Wrench}
        title="Equipment Master"
        description="Manage production equipment for indent selection"
        actions={<>
          <Button variant="warning" icon={Plus} onClick={openAdd}>Add Equipment</Button>
          <BackButton />
        </>}
      />

      <div className="p-6">
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <EquipmentTable
          items={items}
          page={page}
          limit={limit}
          onEdit={openEdit}
          onDelete={del}
          onRowClick={setViewing}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      )}

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
