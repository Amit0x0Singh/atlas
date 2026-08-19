import { useState, useEffect } from 'react'
import { Plus, Tags } from 'lucide-react'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import ProductTable from '../components/product-table/ProductTable.jsx'
import ProductForm from '../components/product-form/ProductForm.jsx'
import ProductDetailModal from '../components/product-detail-modal/ProductDetailModal.jsx'
import { EMPTY_PRODUCT_FILTERS, DEFAULT_PRODUCT_SORT } from '../components/product-table/ProductToolbar.jsx'
import { useProducts, useProductFilterMeta, useCreateProduct, useUpdateProduct, useDeleteProduct } from '../../../../hooks/masters/useProducts.js'
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'
import { normalizeUom, CANONICAL_UNITS } from '../../../../utils/uom.js'
import { productApi } from '../../../../api/masters.js'

const STATE_OPTIONS = [
  { value: 'SOLID',  label: 'Solid' },
  { value: 'LIQUID', label: 'Liquid' },
  { value: 'GAS',    label: 'Gas' },
]
const UOM_OPTIONS = CANONICAL_UNITS.map(u => ({ value: u, label: u }))

export default function ProductMaster() {
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [viewing, setViewing]  = useState(null)
  const [form, setForm]        = useState({ productCode: '', productName: '', uom: '', state: '', plant: [] })
  const [msg, setMsg]          = useState('')
  const [search, setSearch]    = useState('')
  const [filters, setFilters]  = useState(EMPTY_PRODUCT_FILTERS)
  const [sort, setSort]        = useState(DEFAULT_PRODUCT_SORT)
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)
  const [exporting, setExporting] = useState(false)

  // Debounce filters before they hit the query key, so we don't refetch on
  // every keystroke. `search` maps to the backend's `productName` param —
  // the toolbar's single search box is this table's primary quick filter.
  const debouncedFilters = useDebouncedValue({ ...filters, productName: search }, 300)
  useEffect(() => { setPage(1) }, [debouncedFilters])

  const { data: result, isLoading: loading } = useProducts({ ...debouncedFilters, page, limit })
  const items = result?.items ?? []
  const total = result?.total ?? 0

  const { data: meta } = useProductFilterMeta()
  const plantOptions = (meta?.plants || []).map(p => ({ value: p, label: p }))

  const createProduct = useCreateProduct()
  const updateProduct = useUpdateProduct()
  const deleteProduct = useDeleteProduct()

  // Fetches every row matching the current filters (omitting page/limit —
  // the backend treats that as "give me everything", see product-master.
  // controller.js) rather than exporting just the page on screen.
  async function exportProductsCsv() {
    setExporting(true)
    try {
      const r = await productApi.list(debouncedFilters)
      const all = r.data || []
      if (!all.length) { alert('No products to export — adjust your filters.'); return }
      const headers = ['Product Code', 'Product Name', 'UOM', 'State', 'Plant', 'Total Recipe']
      const rows = all.map(it => [
        it.productCode, toTitleCase(it.productName), it.uom || '', it.state || '',
        it.plant?.length ? it.plant.join('; ') : '', it.totalRecipe ?? 0,
      ].map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
      const csv = [headers.join(','), ...rows].join('\n')
      const a = document.createElement('a')
      a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
      a.download = `product_master_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      alert(e.message)
    } finally {
      setExporting(false)
    }
  }

  const openAdd  = () => { setEditing(null); setForm({ productCode: '', productName: '', uom: '', state: '', plant: [] }); setShowForm(true); setMsg('') }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      productCode: item.productCode, productName: toTitleCase(item.productName),
      uom: normalizeUom(item.uom) || item.uom || '', state: (item.state || '').toUpperCase(), plant: item.plant || [],
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

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Tags}
        title="Product Master"
        description="Manage finished product codes, names and plant"
        actions={<>
          <Can permission="masters.product.create">
            <Button variant="success" icon={Plus} onClick={openAdd}>Add New Product</Button>
          </Can>
          <BackButton />
        </>}
      />

      <div className="p-6">
      <ProductTable
        search={search}
        onSearchChange={setSearch}
        filters={filters}
        onFiltersChange={setFilters}
        sort={sort}
        onSortChange={setSort}
        plantOptions={plantOptions}
        uomOptions={UOM_OPTIONS}
        stateOptions={STATE_OPTIONS}
        onExport={exportProductsCsv}
        exporting={exporting}
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
          plantOptions={meta?.plants || []}
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
