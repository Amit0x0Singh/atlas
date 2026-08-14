import { useState, useMemo } from 'react'
import { Plus, Package } from 'lucide-react'
import { useRmMaster, useCreateRm, useUpdateRm, useDeleteRm } from '../../../../hooks/inventory/useRmMaster.js'
import { useOptionValues } from '../../../../hooks/useOptionValues.js'
import { normalizeUom } from '../../../../utils/uom.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'
import './RmMaster.css'
import { Button, BackButton, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import RmTable from '../components/rm-table/page/RmTable.jsx'
import RmForm  from '../components/rm-form/RmForm.jsx'
import RmDetailModal from '../components/rm-detail-modal/RmDetailModal.jsx'

export default function RmMaster() {
  const [filters, setFilters]   = useState({ itemCode: '', itemName: '', conversionRequired: '' })
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [viewing, setViewing]   = useState(null)
  const [form, setForm]         = useState({ itemCode: '', itemName: '', inventoryUom: 'KG', operationalUom: '', trackingType: 'PACK', category: '', subCategory: '', state: '', density: '', conversionRequired: false, lowStockLevel: '', highStockLevel: '' })
  const [msg, setMsg]           = useState('')
  const [page, setPage]         = useState(1)
  const [limit, setLimit]       = useState(15)

  // Loads in full, cached for 30 min (CACHE.MASTER) — every filter (code,
  // name, conversion required) is then applied client-side below.
  const { data: items = [], isLoading: loading, error: rmError } = useRmMaster()
  const error = rmError?.message || ''

  // Category / Sub Category dropdown options — admin-managed (Settings >
  // Select Options), sourced from the CATEGORY / SUB_CATEGORY option groups
  // instead of derived from existing RM records. Values are stored lowercase
  // (text-normalization standard) but shown Title Case here — the form's
  // initial value below is Title-Cased to match so the <select> can find it,
  // and whatever the user picks is re-lowercased on save by the backend.
  const { data: categoryOptions = [] }    = useOptionValues('CATEGORY')
  const { data: subCategoryOptions = [] } = useOptionValues('SUB_CATEGORY')
  const categories    = useMemo(() => categoryOptions.map(o => o.label), [categoryOptions])
  const subCategories = useMemo(() => subCategoryOptions.map(o => o.label), [subCategoryOptions])

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
      // Both UOM selects only offer CANONICAL_UNITS ('KG'/'L'/'NOS') as
      // options — re-running the stored value through normalizeUom() before
      // populating the form guards against older/imported rows that saved a
      // non-canonical casing/alias (e.g. "Kg"), which would otherwise match
      // no <option> and silently fall back to the placeholder instead of
      // showing the item's actual value.
      itemCode: item.itemCode, itemName: toTitleCase(item.itemName),
      inventoryUom: normalizeUom(item.inventoryUom) || item.inventoryUom,
      operationalUom: item.operationalUom ? (normalizeUom(item.operationalUom) || item.operationalUom) : '',
      trackingType: item.trackingType || 'PACK',
      category: toTitleCase(item.category) || '', subCategory: toTitleCase(item.subCategory) || '', state: (item.state || '').toUpperCase(), density: item.density ?? '',
      conversionRequired: !!item.conversionRequired,
      lowStockLevel: item.lowStockLevel ?? '', highStockLevel: item.highStockLevel ?? '',
    })
    setShowForm(true); setMsg('')
  }

  const save = async () => {
    if (!form.itemCode || !form.itemName || !form.inventoryUom) { setMsg('All fields required'); return }
    setMsg('')
    // Conversion is driven entirely by whether the two UOMs differ — not a
    // separate manual choice — so both it and Density are derived here
    // rather than trusted from form state (RmForm keeps its own live badge/
    // field visibility in sync with the same rule, but this is the value
    // that actually gets saved).
    const needsConversion = !!form.operationalUom && form.operationalUom !== form.inventoryUom
    const data = {
      itemName: form.itemName, inventoryUom: form.inventoryUom, operationalUom: form.operationalUom || '', trackingType: form.trackingType,
      category: form.category, subCategory: form.subCategory, state: form.state,
      density: needsConversion ? form.density : '',
      conversionRequired: needsConversion,
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

  const matchesText = (val, q) => !q || (val || '').toLowerCase().includes(q)

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

  const visibleItems = visibleRm

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
          <Can permission="masters.rm.create">
            <Button variant="primary" icon={Plus} onClick={openAdd}>Add New Item</Button>
          </Can>
          <BackButton />
        </>}
      />

      <div className="p-6">
        <RmTable
          visibleItems={visibleItems}
          loading={loading}
          error={error}
          page={page}
          limit={limit}
          filters={filters}
          onFilterChange={setFilter}
          onClearFilters={clearFilters}
          onEdit={openEdit}
          onDelete={del}
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
          categories={categories}
          subCategories={subCategories}
        />
      )}

      <RmDetailModal item={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}
