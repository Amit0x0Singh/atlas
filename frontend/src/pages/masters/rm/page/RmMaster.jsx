import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package } from 'lucide-react'
import { useRmMaster, useCreateRm, useUpdateRm, useDeleteRm } from '../../../../hooks/inventory/useRmMaster.js'
import { usePackingMaterials } from '../../../../hooks/masters/usePackingMaterials.js'
import './RmMaster.css'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import { getChips } from '../../packing/components/packing-constants/packingConstants.jsx'
import RmTable from '../components/rm-table/page/RmTable.jsx'
import RmStatCards from '../components/rm-table/components/RmStatCards.jsx'
import RmForm  from '../components/rm-form/RmForm.jsx'
import RmDetailModal from '../components/rm-detail-modal/RmDetailModal.jsx'

export default function RmMaster() {
  const navigate = useNavigate()

  const [filters, setFilters]   = useState({ itemCode: '', itemName: '', uom: '', packingSpec: '' })
  const [filterType, setFilterType] = useState('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [viewing, setViewing]   = useState(null)
  const [form, setForm]         = useState({ itemCode: '', itemName: '', uom: 'KG', operationUom: '', trackingType: 'PACK', category: '', subCategory: '', state: '', density: '', conversionRequired: false, lowStockLevel: '', highStockLevel: '' })
  const [msg, setMsg]           = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  // Both lists load in full, cached for 30 min (CACHE.MASTER) — every filter
  // (code, name, UOM, type, packing spec) is then applied client-side below.
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
    setForm({ itemCode: '', itemName: '', uom: 'KG', operationUom: '', trackingType: 'PACK', category: '', subCategory: '', state: '', density: '', conversionRequired: false, lowStockLevel: '', highStockLevel: '' })
    setShowForm(true); setMsg('')
  }
  const openEdit = (item) => {
    setEditing(item)
    setForm({
      itemCode: item.itemCode, itemName: item.itemName, uom: item.uom, operationUom: item.operationUom || '', trackingType: item.trackingType || 'PACK',
      category: item.category || '', subCategory: item.subCategory || '', state: item.state || '', density: item.density ?? '',
      conversionRequired: !!item.conversionRequired,
      lowStockLevel: item.lowStockLevel ?? '', highStockLevel: item.highStockLevel ?? '',
    })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.itemCode || !form.itemName || !form.uom) { setMsg('All fields required'); return }
    setMsg('')
    const data = {
      itemName: form.itemName, uom: form.uom, operationUom: form.operationUom || '', trackingType: form.trackingType,
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
  const specTextFor = (p) => [p.subType, p.category, ...getChips(p).map(c => c.label)].filter(Boolean).join(' ').toLowerCase()

  // Packing rows only surface in "ALL" or the dedicated "PACKING" view —
  // PACK/BULK is an RM-only tracking-type distinction that doesn't apply to
  // them, and a Packing Spec filter (a field only packing items have) never
  // matches an RM row, so it naturally excludes them below.
  const visiblePacking = useMemo(() => {
    if (filterType !== 'ALL' && filterType !== 'PACKING') return []
    const code = filters.itemCode.trim().toLowerCase()
    const name = filters.itemName.trim().toLowerCase()
    const spec = filters.packingSpec.trim().toLowerCase()
    return packingItems
      .filter(p =>
        matchesText(p.itemCode, code) &&
        matchesText(p.itemName, name) &&
        (!filters.uom || p.uom === filters.uom) &&
        (!spec || specTextFor(p).includes(spec))
      )
      .map(p => ({ ...p, kind: 'packing' }))
  }, [packingItems, filterType, filters])

  const visibleRm = useMemo(() => {
    if (filterType === 'PACKING' || filters.packingSpec.trim()) return []
    const code = filters.itemCode.trim().toLowerCase()
    const name = filters.itemName.trim().toLowerCase()
    return items
      .filter(i =>
        (filterType === 'ALL' || (i.trackingType || 'PACK') === filterType) &&
        matchesText(i.itemCode, code) &&
        matchesText(i.itemName, name) &&
        (!filters.uom || i.uom === filters.uom)
      )
      .map(i => ({ ...i, kind: 'rm' }))
  }, [items, filterType, filters])

  const visibleItems = [...visibleRm, ...visiblePacking]
  const packCount = items.filter(i => (i.trackingType || 'PACK') === 'PACK').length
  const bulkCount = items.filter(i => i.trackingType === 'BULK').length

  const uomOptions = useMemo(() => {
    const set = new Set()
    items.forEach(i => i.uom && set.add(i.uom))
    packingItems.forEach(p => p.uom && set.add(p.uom))
    return [...set].sort()
  }, [items, packingItems])

  const setFilter = (field, value) => { setFilters(f => ({ ...f, [field]: value })); setPage(1) }
  const clearFilters = () => { setFilters({ itemCode: '', itemName: '', uom: '', packingSpec: '' }); setFilterType('ALL'); setPage(1) }

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

      <div className="p-6 space-y-5">
        <RmStatCards
          rmTotal={items.length}
          packCount={packCount}
          bulkCount={bulkCount}
          packingTotal={packingItems.length}
          loading={loading || loadingPacking}
        />

        <RmTable
          visibleItems={visibleItems}
          loading={loading || loadingPacking}
          error={error}
          page={page}
          limit={limit}
          filters={filters}
          uomOptions={uomOptions}
          filterType={filterType}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
          onFilterType={t => { setFilterType(t); setPage(1) }}
          onEdit={openEdit}
          onDelete={del}
          onViewPacking={goToPacking}
          onRowClick={setViewing}
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

        <RmDetailModal item={viewing} onClose={() => setViewing(null)} />
      </div>
    </div>
  )
}
