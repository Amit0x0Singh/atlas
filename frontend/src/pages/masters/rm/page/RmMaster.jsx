import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import { useRmMaster, useCreateRm, useUpdateRm, useDeleteRm } from '../../../../hooks/inventory/useRmMaster.js'
import { usePackingMaterials } from '../../../../hooks/masters/usePackingMaterials.js'
import './RmMaster.css'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import RmTable from '../components/rm-table/page/RmTable.jsx'
import RmForm  from '../components/rm-form/RmForm.jsx'
import RmDetailModal from '../components/rm-detail-modal/RmDetailModal.jsx'

export default function RmMaster() {
  const navigate = useNavigate()

  const [filters, setFilters]   = useState({ itemCode: '', itemName: '', conversionRequired: '' })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [viewing, setViewing]   = useState(null)
  const [form, setForm]         = useState({ itemCode: '', itemName: '', inventoryUom: 'KG', operationalUom: '', trackingType: 'PACK', category: '', subCategory: '', state: '', density: '', conversionRequired: false, lowStockLevel: '', highStockLevel: '' })
  const [msg, setMsg]           = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  // Both lists load in full, cached for 30 min (CACHE.MASTER) — every filter
  // (code, name, conversion required) is then applied client-side below.
  // Packing materials live in their own table (packing_materials) — fetched
  // here purely so they can be *displayed* alongside RM items in one unified
  // overview table. Nothing about the two schemas merges; editing a packing
  // item still only happens on the dedicated Packing Materials page.
  const { data: items = [], isLoading: loading, error: rmError } = useRmMaster()
  const { data: packingItems = [], isLoading: loadingPacking } = usePackingMaterials()
  const error = rmError?.message || ''

  const createRm = useCreateRm()
  const updateRm = useUpdateRm()
  const deleteRm = useDeleteRm()
  const saving = createRm.isPending || updateRm.isPending

  const openAdd = () => {
    setEditing(null)
    setForm({ itemCode: '', itemName: '', inventoryUom: 'KG', operationalUom: '', trackingType: 'PACK', category: '', subCategory: '', state: '', density: '', conversionRequired: false, lowStockLevel: '', highStockLevel: '' })
    setShowForm(true); setMsg('')
  }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      itemCode: item.itemCode, itemName: item.itemName, inventoryUom: item.inventoryUom, operationalUom: item.operationalUom || '', trackingType: item.trackingType || 'PACK',
      category: item.category || '', subCategory: item.subCategory || '', state: item.state || '', density: item.density ?? '',
      conversionRequired: !!item.conversionRequired,
      lowStockLevel: item.lowStockLevel ?? '', highStockLevel: item.highStockLevel ?? '',
    })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.itemCode || !form.itemName || !form.inventoryUom) { setMsg('All fields required'); return }
    setMsg('')
    const data = {
      itemName: form.itemName, inventoryUom: form.inventoryUom, operationalUom: form.operationalUom || '', trackingType: form.trackingType,
      category: form.category, subCategory: form.subCategory, state: form.state,
      density: form.state === 'LIQUID' ? form.density : '',
      conversionRequired: form.conversionRequired,
      lowStockLevel: form.lowStockLevel, highStockLevel: form.highStockLevel,
    }
    try {
      if (editing) await updateRm.mutateAsync({ code: form.itemCode, data })
      else await createRm.mutateAsync({ ...data, itemCode: form.itemCode })
      setShowForm(false)
    } catch (e) { setMsg(e.message) }
  }

  const del = async (code) => {
    if (!confirm(`Delete ${code}? This cannot be undone.`)) return
    try { await deleteRm.mutateAsync(code) } catch (e) { alert(e.message) }
  }

  const goToPacking = () => navigate('/packing-master')

  const matchesText = (val, q) => !q || (val || '').toLowerCase().includes(q)

  // Conversion Required is an RM-only concept — packing rows have no such
  // attribute, so they drop out of the list whenever that filter is active.
  const visiblePacking = useMemo(() => {
    if (filters.conversionRequired) return []
    const code = filters.itemCode.trim().toLowerCase()
    const name = filters.itemName.trim().toLowerCase()
    return packingItems
      .filter(p => matchesText(p.itemCode, code) && matchesText(p.itemName, name))
      .map(p => ({ ...p, kind: 'packing' }))
  }, [packingItems, filters])

  const visibleRm = useMemo(() => {
    const code = filters.itemCode.trim().toLowerCase()
    const name = filters.itemName.trim().toLowerCase()
    return items
      .filter(i =>
        matchesText(i.itemCode, code) &&
        matchesText(i.itemName, name) &&
        (!filters.conversionRequired || !!i.conversionRequired === (filters.conversionRequired === 'YES'))
      )
      .map(i => ({ ...i, kind: 'rm' }))
  }, [items, filters])

  const visibleItems = [...visibleRm, ...visiblePacking]

  const setFilter = (field, value) => { setFilters(f => ({ ...f, [field]: value })); setPage(1) }
  const clearFilters = () => { setFilters({ itemCode: '', itemName: '', conversionRequired: '' }); setPage(1) }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Package}
        title="Item Master"
        description={
        <>Manage item details, inventory attributes and QR tracking configuration.</>
           }
        actions={<>
          <Button variant="primary" icon={Plus} onClick={openAdd}>Add New Item</Button>
          <BackButton />
        </>}
      />

      <div className="p-6">
        <RmTable
          visibleItems={visibleItems}
          loading={loading || loadingPacking}
          error={error}
          page={page}
          limit={limit}
          filters={filters}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
          onEdit={openEdit}
          onDelete={del}
          onViewPacking={goToPacking}
          onRowClick={setViewing}
          onPageChange={setPage}
          onLimitChange={l => { setLimit(l); setPage(1) }}
        />
      </div>

      {/* Modals render outside the padded content column — they're
          fixed-position overlays, not part of the page's content flow, so
          they must never sit inside a `space-y-*` sibling-margin container
          (that margin still applies to `position: fixed` elements and was
          pushing the backdrop down, leaving a gap at the top of the screen). */}
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

      <RmDetailModal item={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
