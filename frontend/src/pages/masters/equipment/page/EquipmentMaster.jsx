import { useState, useEffect } from 'react'
import { Plus, Wrench } from 'lucide-react'
import { equipmentApi } from '../../../../api/masters.js'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import EquipmentTable from '../components/equipment-table/EquipmentTable.jsx'
import EquipmentForm from '../components/equipment-form/EquipmentForm.jsx'

export default function EquipmentMaster() {
  const [items, setItems]   = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState({ equipName: '', plant: '' })
  const [saving, setSaving]    = useState(false)
  const [msg, setMsg]          = useState('')
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  const load = async () => {
    try { setLoading(true); const r = await equipmentApi.list(); setItems(r.data || []) }
    catch (e) { console.error(e) } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openAdd  = () => { setEditing(null); setForm({ equipName: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => { setEditing(item); setForm({ equipName: item.equipName, plant: item.plant }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.equipName) { setMsg('Equipment name is required'); return }
    setSaving(true); setMsg('')
    try {
      if (editing) await equipmentApi.update(editing.equipId, form)
      else await equipmentApi.create(form)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const del = async (id, name) => {
    if (!confirm(`Delete equipment "${name}"?`)) return
    try { await equipmentApi.delete(id); load() } catch (e) { alert(e.message) }
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
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      )}

      {showForm && (
        <EquipmentForm
          editing={editing}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={saving}
          msg={msg}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
      </div>
    </div>
  )
}
