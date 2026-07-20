import { useState, useEffect } from 'react'
import { Plus, Tags, Search } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import ProductTable from '../components/product-table/ProductTable.jsx'
import ProductForm from '../components/product-form/ProductForm.jsx'
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../../../hooks/masters/useProducts.js'

export default function ProductMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState({ productCode: '', productName: '', uom: '', state: '', plant: '' })
  const [msg, setMsg]          = useState('')
  const [search, setSearch]    = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  // Debounce search input before it hits the query key, so we don't
  // refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(t)
  }, [search])
  useEffect(() => { setPage(1) }, [debouncedSearch])

  const { data: items = [], isLoading: loading } = useProducts({ search: debouncedSearch })
  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const openAdd  = () => { setEditing(null); setForm({ productCode: '', productName: '', uom: '', state: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      productCode: item.productCode, productName: item.productName,
      uom: item.uom || '', state: item.state || '', plant: (item.plant || []).join(', '),
    })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.productCode || !form.productName) { setMsg('Product Code and Name are required'); return }
    setMsg('')
    const data = { productName: form.productName, uom: form.uom, state: form.state, plant: form.plant }
    try {
      if (editing) await updateProduct.mutateAsync({ code: form.productCode, data })
      else await createProduct.mutateAsync({ ...data, productCode: form.productCode })
      setShowForm(false)
    } catch (e) { setMsg(e.message) }
  }

  const del = async (code) => {
    if (!confirm(`Delete product ${code}?`)) return
    try { await deleteProduct.mutateAsync(code) } catch (e) { alert(e.message) }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Tags}
        title="Product Master"
        description="Manage finished product codes, names and plant"
        actions={<>
          <Button variant="success" icon={Plus} onClick={openAdd}>Add New Product</Button>
          <BackButton />
        </>}
      />

      <div className="p-6">
      <div className="mb-4">
        <div className="relative w-80">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>
      </div>

      <ProductTable
        items={items}
        loading={loading}
        page={page}
        limit={limit}
        onEdit={openEdit}
        onDelete={del}
        onPageChange={setPage}
        onLimitChange={l => { setLimit(l); setPage(1) }}
      />

      {showForm && (
        <ProductForm
          editing={editing}
          form={form}
          onChange={(field, val) => setForm(f => ({ ...f, [field]: val }))}
          saving={createProduct.isPending || updateProduct.isPending}
          msg={msg}
          onSave={save}
          onClose={() => setShowForm(false)}
        />
      )}
      </div>
    </div>
  )
}
