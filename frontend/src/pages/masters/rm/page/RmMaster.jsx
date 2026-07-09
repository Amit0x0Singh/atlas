import { useState, useEffect, useRef } from 'react'
import { Plus, Package } from 'lucide-react'
import { rmApi } from '../../../../api/inventory.js'
import './RmMaster.css'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import RmTable from '../components/rm-table/RmTable.jsx'
import RmForm  from '../components/rm-form/RmForm.jsx'

export default function RmMaster() {
  const [items, setItems]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [filterType, setFilterType] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ itemCode: '', itemName: '', uom: 'KG', trackingType: 'PACK' })
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  // Guards against out-of-order responses — if the user keeps typing, an
  // older request can resolve after a newer one and would otherwise
  // overwrite fresher results with stale data.
  const requestSeq = useRef(0)

  const load = async () => {
    const seq = ++requestSeq.current
    try {
      setLoading(true)
      const res = await rmApi.list({ search })
      if (seq !== requestSeq.current) return
      setItems(res.data || [])
      setError('')
    } catch (e) { if (seq === requestSeq.current) setError(e.message) }
    finally { if (seq === requestSeq.current) setLoading(false) }
  }

  // First render loads immediately; subsequent search changes are debounced
  // (~300ms after the user stops typing) instead of re-fetching on every
  // keystroke, so it isn't re-fetching (and re-rendering the table) mid-word.
  const didMount = useRef(false)
  useEffect(() => {
    if (!didMount.current) { didMount.current = true; load(); return }
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const openAdd = () => {
    setEditing(null)
    setForm({ itemCode: '', itemName: '', uom: 'KG', trackingType: 'PACK' })
    setShowForm(true); setMsg('')
  }
  const openEdit = (item) => {
    setEditing(item)
    setForm({ itemCode: item.itemCode, itemName: item.itemName, uom: item.uom, trackingType: item.trackingType || 'PACK' })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.itemCode || !form.itemName || !form.uom) { setMsg('All fields required'); return }
    setSaving(true); setMsg('')
    try {
      if (editing) await rmApi.update(form.itemCode, { itemName: form.itemName, uom: form.uom, trackingType: form.trackingType })
      else await rmApi.create(form)
      setShowForm(false); load()
    } catch (e) { setMsg(e.message) } finally { setSaving(false) }
  }

  const del = async (code) => {
    if (!confirm(`Delete ${code}? This cannot be undone.`)) return
    try { await rmApi.delete(code); load() } catch (e) { alert(e.message) }
  }

  const visibleItems = items.filter(i => filterType === 'ALL' || (i.trackingType || 'PACK') === filterType)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Package}
        title="Item Master"
        description={<>
          Manage item codes, names and units ·{' '}
          <span className="text-blue-600 font-medium">PACK</span> = individual QR per bag ·{' '}
          <span className="text-green-600 font-medium">BULK</span> = location QR (bags/labels/consumables in bulk)
        </>}
        actions={<>
          <Button variant="primary" icon={Plus} onClick={openAdd}>Add New Item</Button>
          <BackButton />
        </>}
      />

      <div className="p-6">
      <RmTable
        items={items}
        visibleItems={visibleItems}
        loading={loading}
        error={error}
        page={page}
        limit={limit}
        search={search}
        filterType={filterType}
        onSearch={v => { setSearch(v); setPage(1) }}
        onFilterType={t => { setFilterType(t); setPage(1) }}
        onEdit={openEdit}
        onDelete={del}
        onPageChange={setPage}
        onLimitChange={l => { setLimit(l); setPage(1) }}
      />

      {showForm && (
        <RmForm
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
