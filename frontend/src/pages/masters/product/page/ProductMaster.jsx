import { useState, useEffect } from 'react'
import { Plus, Tags } from 'lucide-react'
import { Button, BackButton, PageHeader, MasterFilters } from '../../../../components/ui'
import ProductTable from '../components/product-table/ProductTable.jsx'
import ProductForm from '../components/product-form/ProductForm.jsx'
import ProductDetailModal from '../components/product-detail-modal/ProductDetailModal.jsx'
import { useProducts, useProductFilterMeta, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../../../hooks/masters/useProducts.js'
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'
import { normalizeUom } from '../../../../utils/uom.js'

const BLANK_FILTERS = { productCode: '', productName: '', plant: '' }

export default function ProductMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [viewing, setViewing]  = useState(null)
  const [form, setForm]        = useState({ productCode: '', productName: '', uom: '', state: '', plant: '' })
  const [msg, setMsg]          = useState('')
  const [filters, setFilters]  = useState(BLANK_FILTERS)
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  // Debounce filters before they hit the query key, so we don't refetch on
  // every keystroke.
  const debouncedFilters = useDebouncedValue(filters, 300)
  useEffect(() => { setPage(1) }, [debouncedFilters])

  const { data: result, isLoading: loading } = useProducts({ ...debouncedFilters, page, limit })
  const items = result?.items ?? []
  const total = result?.total ?? 0

  const { data: meta } = useProductFilterMeta()
  const plantOptions = (meta?.plants || []).map(p => ({ value: p, label: p }))

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  const openAdd  = () => { setEditing(null); setForm({ productCode: '', productName: '', uom: '', state: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      productCode: item.productCode, productName: toTitleCase(item.productName),
      uom: normalizeUom(item.uom) || item.uom || '', state: (item.state || '').toUpperCase(), plant: (item.plant || []).join(', '),
    })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.productName) { setMsg('Product Name is required'); return }
    setMsg('')
    const data = { productName: form.productName, uom: form.uom, state: form.state, plant: form.plant }
    try {
      if (editing) await updateProduct.mutateAsync({ code: form.productCode, data })
      else await createProduct.mutateAsync(data)
      setShowForm(false)
    } catch (e) { setMsg(e.message) }
  }

  const del = async (code) => {
    if (!confirm(`Delete product ${code}?`)) return
    try { await deleteProduct.mutateAsync(code) } catch (e) { alert(e.message) }
  }

  const setFilter = (key, value) => setFilters(f => ({ ...f, [key]: value }))
  const clearFilters = () => setFilters(BLANK_FILTERS)

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
      <MasterFilters
        fields={[
          { key: 'productCode', label: 'Product Code', type: 'text', placeholder: 'Search code…' },
          { key: 'productName', label: 'Product Name', type: 'text', placeholder: 'Search name…' },
          { key: 'plant',       label: 'Plant',         type: 'select', options: plantOptions, allLabel: 'All Plants' },
        ]}
        values={filters}
        resultCount={total}
        onChange={setFilter}
        onClear={clearFilters}
      />

      <ProductTable
        items={items}
        total={total}
        loading={loading}
        page={page}
        limit={limit}
        onEdit={openEdit}
        onDelete={del}
        onRowClick={setViewing}
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

      <ProductDetailModal item={viewing} onClose={() => setViewing(null)} />
      </div>
    </div>
  )
}
