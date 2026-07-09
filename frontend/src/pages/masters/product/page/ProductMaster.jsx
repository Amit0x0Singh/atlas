import { useState, useEffect, useRef } from 'react'
import { Plus, Tags, Search } from 'lucide-react'
import { productApi } from '../../../../api/masters.js'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import ProductTable from '../components/product-table/ProductTable.jsx'
import ProductForm from '../components/product-form/ProductForm.jsx'

export default function ProductMaster() {
  const [items, setItems]      = useState([])
  const [loading, setLoading]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]  = useState(null)
  const [form, setForm]        = useState({ productCode: '', productName: '', plant: '' })
  const [saving, setSaving]    = useState(false)
  const [msg, setMsg]          = useState('')
  const [search, setSearch]    = useState('')
  const [page, setPage]        = useState(1)
  const [limit, setLimit]      = useState(15)

  // Guards against out-of-order responses — an older request resolving
  // after a newer one would otherwise overwrite fresher results.
  const requestSeq = useRef(0)

  const load = async () => {
    const seq = ++requestSeq.current
    try {
      setLoading(true)
      const r = await productApi.list({ search })
      if (seq !== requestSeq.current) return
      setItems(r.data || [])
    } catch (e) { console.error(e) }
    finally { if (seq === requestSeq.current) setLoading(false) }
  }

  // First render loads immediately; subsequent search changes are debounced
  // instead of re-fetching on every keystroke.
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; load(); return }
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])
  useEffect(() => { setPage(1) }, [items])

  const openAdd  = () => { setEditing(null); setForm({ productCode: '', productName: '', plant: '' }); setShowForm(true); setMsg('') }
  const openEdit = (item) => { setEditing(item); setForm({ productCode: item.productCode, productName: item.productName, plant: item.plant }); setShowForm(true); setMsg('') }

  const save = async () => {
    if (!form.productCode || !form.productName) { setMsg('Product Code and Name are required'); return }
    setSaving(true); setMsg('')
    try {
      if (editing) await productApi.update(form.productCode, { productName: form.productName, plant: form.plant })
      else await productApi.create(form)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const del = async (code) => {
    if (!confirm(`Delete product ${code}?`)) return
    try { await productApi.delete(code); load() } catch (e) { alert(e.message) }
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
