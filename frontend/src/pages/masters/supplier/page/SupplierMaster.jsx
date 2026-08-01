import { useState, useEffect } from 'react'
import { Plus, Building } from 'lucide-react'
import { Button, BackButton, PageHeader, MasterFilters } from '../../../../components/ui'
import SupplierTable from '../components/supplier-table/SupplierTable.jsx'
import SupplierForm from '../components/supplier-form/SupplierForm.jsx'
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '../../../../hooks/masters/useSuppliers.js'
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue.js'

const EMPTY = { supplier_name: '', phone: '', email: '', gstin: '', address: '' }
const BLANK_FILTERS = { supplier_name: '', phone: '', email: '', gstin: '', address: '' }

export default function SupplierMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState(EMPTY)
  const [msg, setMsg]          = useState('')
  const [filters, setFilters]  = useState(BLANK_FILTERS)
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  const debouncedFilters = useDebouncedValue(filters, 300)
  useEffect(() => { setPage(1) }, [debouncedFilters])

  const { data: result, isLoading: loading } = useSuppliers({ ...debouncedFilters, page, limit })
  const items = result?.items ?? []
  const total = result?.total ?? 0

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

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }))
  const clearFilters = () => setFilters(BLANK_FILTERS)

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
      <MasterFilters
        fields={[
          { key: 'supplier_name', label: 'Supplier Name', type: 'text', placeholder: 'Search name…' },
          { key: 'phone',         label: 'Phone',          type: 'text', placeholder: 'Search phone…' },
          { key: 'email',         label: 'Email',          type: 'text', placeholder: 'Search email…' },
          { key: 'gstin',         label: 'GSTIN',          type: 'text', placeholder: 'Search GSTIN…' },
          { key: 'address',       label: 'Address',        type: 'text', placeholder: 'Search address…' },
        ]}
        values={filters}
        resultCount={total}
        onChange={setFilter}
        onClear={clearFilters}
      />

      {loading ? <p className="text-gray-500">Loading...</p> : (
        <SupplierTable
          items={items}
          total={total}
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
