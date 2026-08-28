import { useState, useMemo } from 'react'
import { Plus, Building } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import SupplierTable from '../components/supplier-table/SupplierTable.jsx'
import SupplierForm from '../components/supplier-form/SupplierForm.jsx'
import { EMPTY_SUPPLIER_FILTERS } from '../components/supplier-table/SupplierFilterModal.jsx'
import { DEFAULT_SUPPLIER_SORT } from '../components/supplier-table/SupplierSortModal.jsx'
import { useSuppliers, useCreateSupplier, useUpdateSupplier } from '../../../../hooks/masters/useSuppliers.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'

const EMPTY = { supplier_name: '', phone: '', email: '', gstin: '', address: '' }

export default function SupplierMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState(EMPTY)
  const [msg, setMsg]          = useState('')
  const [search, setSearch]    = useState('')
  const [filters, setFilters]  = useState(EMPTY_SUPPLIER_FILTERS)
  const [sort, setSort]        = useState(DEFAULT_SUPPLIER_SORT)
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  // No page/limit passed — the endpoint's pagination is opt-in, so this
  // loads the full supplier list once (cached) and search/filter/sort/
  // paginate all happen client-side below, same pattern as Item Master.
  const { data: result, isLoading: loading } = useSuppliers({})
  const allSuppliers = result?.items ?? []

  const createSupplier = useCreateSupplier()
  const updateSupplier = useUpdateSupplier()

  const openAdd  = () => { setEditing(null); setForm(EMPTY); setShowForm(true); setMsg('') }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      supplier_name: toTitleCase(item.supplierName), phone: item.phone || '',
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
    if (!confirm(`Deactivate supplier "${toTitleCase(name)}"? It will no longer show up in dropdowns/suggestions, but past records referencing it are unaffected.`)) return
    try { await updateSupplier.mutateAsync({ id, data: { is_active: false } }) } catch (e) { alert(e.message) }
  }

  const visibleSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase()
    let list = allSuppliers.filter(s => {
      if (q) {
        const haystack = `${s.supplierName || ''} ${s.phone || ''} ${s.email || ''} ${s.gstin || ''} ${s.address || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      if (filters.phone && !s.phone?.toLowerCase().includes(filters.phone.toLowerCase())) return false
      if (filters.email && !s.email?.toLowerCase().includes(filters.email.toLowerCase())) return false
      if (filters.gstin && !s.gstin?.toLowerCase().includes(filters.gstin.toLowerCase())) return false
      if (filters.address && !s.address?.toLowerCase().includes(filters.address.toLowerCase())) return false
      return true
    })

    const dir = sort.direction === 'asc' ? 1 : -1
    list = [...list].sort((a, b) => {
      if (sort.field === 'email') return dir * (a.email || '').localeCompare(b.email || '')
      if (sort.field === 'gstin') return dir * (a.gstin || '').localeCompare(b.gstin || '')
      return dir * (a.supplierName || '').localeCompare(b.supplierName || '') // 'name'
    })

    return list
  }, [allSuppliers, search, filters, sort])

  const paginated = visibleSuppliers.slice((page - 1) * limit, page * limit)

  function exportSuppliersCsv() {
    if (!visibleSuppliers.length) { alert('No suppliers to export — adjust your filters.'); return }
    const headers = ['Supplier Name', 'Phone', 'Email', 'GSTIN', 'Address']
    const rows = visibleSuppliers.map(s => [
      toTitleCase(s.supplierName), s.phone || '', s.email || '', s.gstin || '', s.address || '',
    ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
    const csv = [headers.join(','), ...rows].join('\n')
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    a.download = `suppliers_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Building}
        title="Supplier Master"
        description="Manage suppliers used for gate inward and other supply-chain suggestions"
        actions={<>
          <Can permission="masters.erp-supplier.create">
            <Button variant="primary" icon={Plus} onClick={openAdd}>Add Supplier</Button>
          </Can>
          <BackButton />
        </>}
      />

      <div className="p-6">
      {loading ? <p className="text-gray-500">Loading...</p> : (
        <SupplierTable
          items={paginated}
          total={visibleSuppliers.length}
          page={page}
          limit={limit}
          search={search}
          onSearchChange={v => { setSearch(v); setPage(1) }}
          filters={filters}
          onFiltersChange={f => { setFilters(f); setPage(1) }}
          sort={sort}
          onSortChange={setSort}
          onExport={exportSuppliersCsv}
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
