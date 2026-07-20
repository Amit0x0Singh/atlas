import { useState } from 'react'
import { Plus, Building } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import SupplierTable from '../components/supplier-table/SupplierTable.jsx'
import SupplierForm from '../components/supplier-form/SupplierForm.jsx'
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '../../../../hooks/masters/useSuppliers.js'

const EMPTY = { supplier_name: '', phone: '', email: '', gstin: '', address: '' }

export default function SupplierMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState(EMPTY)
  const [msg, setMsg]          = useState('')
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  const { data: items = [], isLoading: loading } = useSuppliers()
  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      supplier_name: item.supplierName, phone: item.phone || '',
      email: item.email || '', gstin: item.gstin || '', address: item.address || '',
    })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.supplier_name.trim()) { setMsg('Supplier name is required'); return }
    setMsg('')
    try {
      if (editing) await updateSupplier.mutateAsync({ id: editing.supplierId, data: form })
      else await createSupplier.mutateAsync(form)
      setShowForm(false)
    } catch (e) { setMsg(e.message) }
  }

  const deactivate = async (id, name) => {
    if (!confirm(`Deactivate supplier "${name}"? It will no longer show up in dropdowns/suggestions, but past records referencing it are unaffected.`)) return
    try { await updateSupplier.mutateAsync({ id, data: { is_active: false } }) } catch (e) { alert(e.message) }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Building}
        title="Supplier Master"
        description="Manage suppliers used for gate inward and other supply-chain suggestions"
        actions={<>
          <Button variant="primary" icon={Plus} onClick={openAdd}>Add Supplier</Button>
          <BackButton />
        </>}
      />

      <div className="p-6">
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <SupplierTable
          items={items}
          page={page}
          limit={limit}
          onEdit={openEdit}
          onDeactivate={deactivate}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      )}

      {showForm && (
        <SupplierForm
          editing={editing}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={createSupplier.isPending || updateSupplier.isPending}
          msg={msg}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
      </div>
    </div>
  )
}
