import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import './RecipeDB.css'
import { DeleteModal, ErrorModal } from '../../../../components/ui'
import ProductSidebar    from '../components/product-sidebar/ProductSidebar.jsx'
import BomEditor         from '../components/bom-editor/page/BomEditor.jsx'
import ReconcileModal    from '../components/reconcile-modal/ReconcileModal.jsx'
import { useProducts } from '../../../../hooks/masters/useProducts.js'
import { useRmMaster } from '../../../../hooks/inventory/useRmMaster.js'
import { useMicrobes } from '../../../../hooks/masters/useMicrobes.js'
import { useRecipe, useBulkSaveRecipe, useDeleteRecipeRow } from '../../../../hooks/masters/useRecipes.js'
import { queryKeys } from '../../../../lib/queryKeys.js'

const EMPTY_ROW = () => ({ id: null, rmCode: '', rmName: '', qtyPerUnit: '', uom: 'KG', roleType: 'INGREDIENT', isMicrobe: false, microbeCode: null, requiredCfu: '', _dirty: true })

export default function RecipeDB() {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [bomRows, setBomRows]             = useState([])
  const [prodSearch, setProdSearch]       = useState('')
  const [msg, setMsg]                     = useState({ type: '', text: '' })
  const [deleteRowIdx, setDeleteRowIdx]   = useState(null)
  const [errModal, setErrModal]           = useState({ open: false, message: '' })

  const [reconcileModal, setReconcileModal] = useState(false)

  // Bumped only once bomRows actually holds the freshly-fetched product's
  // rows — BomEditor's item-name seeding effect keys off this instead of
  // selectedProduct.productCode, which changes synchronously on click, well
  // before the recipe query below resolves.
  const [loadId, setLoadId] = useState(0)

  const qc = useQueryClient()
  const { data: productList = [], isLoading: productsLoading } = useProducts()
  const { data: rmList = [] } = useRmMaster()
  const { data: microbeList = [] } = useMicrobes()
  const loading = productsLoading
  const recipeQuery = useRecipe(selectedProduct?.productCode)
  const bulkSaveRecipe = useBulkSaveRecipe()
  const deleteRecipeRow = useDeleteRecipeRow()

  // Seed the editable bomRows draft whenever a fresh fetch lands for the
  // currently selected product (initial select, or refetch after save).
  const seededForRef = useRef(null)
  useEffect(() => {
    if (!selectedProduct || !recipeQuery.data) return
    const key = `${selectedProduct.productCode}:${recipeQuery.dataUpdatedAt}`
    if (seededForRef.current === key) return
    seededForRef.current = key
    const data = recipeQuery.data
    setBomRows(data.length > 0 ? data.map(r => ({ ...r, _dirty: false })) : [EMPTY_ROW()])
    setLoadId(id => id + 1)
  }, [selectedProduct, recipeQuery.data, recipeQuery.dataUpdatedAt])

  const selectProduct = (prod) => {
    setSelectedProduct(prod)
    setBomRows([])
    setProdSearch('')
    setMsg({ type: '', text: '' })
  }

  const updateRow = (idx, field, value) => {
    setBomRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, _dirty: true } : r))
  }

  // `picked` is an RM Master row ({ itemCode, itemName, uom }), a Product
  // Master row ({ productCode, productName }) — a recipe component can
  // legitimately be an SFG (semi-finished good) used as an ingredient, in
  // which case its code lives in Product Master, not RM Master — or a
  // Microbe Master row ({ microbeCode, microbeName, uom }).
  const selectRm = (idx, picked, kind = 'rm') => {
    const code = kind === 'product' ? picked.productCode : kind === 'microbe' ? picked.microbeCode : picked.itemCode
    const name = kind === 'product' ? picked.productName : kind === 'microbe' ? picked.microbeName : picked.itemName
    setBomRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (kind === 'microbe') {
        return { ...r, rmCode: code, rmName: name, roleType: 'MICROBE', isMicrobe: true, microbeCode: code, _dirty: true }
      }
      // Re-picking a plain RM/product on a row that used to point at a
      // microbe leaves it no longer actually microbe-linked — clear the
      // stale flags instead of letting them keep pointing at the old microbe.
      return {
        ...r, rmCode: code, rmName: name, uom: kind === 'product' ? r.uom : picked.uom,
        roleType: r.roleType === 'MICROBE' ? 'INGREDIENT' : r.roleType,
        isMicrobe: false, microbeCode: null, _dirty: true,
      }
    }))
  }

  const addRow = () => setBomRows(prev => [...prev, EMPTY_ROW()])

  const removeRow = (idx) => {
    const row = bomRows[idx]
    if (row.id) { setDeleteRowIdx(idx); return }
    setBomRows(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      return updated.length === 0 ? [EMPTY_ROW()] : updated
    })
  }

  const confirmRemoveRow = async () => {
    const idx = deleteRowIdx
    const row = bomRows[idx]
    setDeleteRowIdx(null)
    try { await deleteRecipeRow.mutateAsync(row.id) }
    catch (e) { setErrModal({ open: true, message: e.message }); return }
    setBomRows(prev => {
      const updated = prev.filter((_, i) => i !== idx)
      return updated.length === 0 ? [EMPTY_ROW()] : updated
    })
  }

  const saveAll = async () => {
    if (!selectedProduct) { setMsg({ type: 'error', text: 'Select a product first' }); return }
    const toSave = bomRows.filter(r => r._dirty && r.rmCode && r.qtyPerUnit)
    if (toSave.length === 0) { setMsg({ type: 'error', text: 'No rows to save. Fill RM and Qty.' }); return }
    setMsg({ type: '', text: '' })
    try {
      const payload = toSave.map(r => ({
        id: r.id || undefined,
        productCode: selectedProduct.productCode,
        productName: selectedProduct.productName,
        rmCode: r.rmCode, rmName: r.rmName,
        qtyPerUnit: r.qtyPerUnit, uom: r.uom,
        roleType: r.roleType || 'INGREDIENT',
        isMicrobe: r.isMicrobe || false,
        microbeCode: r.microbeCode || null,
        requiredCfu: r.requiredCfu !== '' && r.requiredCfu != null ? r.requiredCfu : null,
      }))
      const res = await bulkSaveRecipe.mutateAsync(payload)
      setMsg({ type: 'success', text: `✅ ${res.saved} rows saved` })
      // The mutation's invalidation triggers a recipe refetch, which the
      // effect above picks up (via dataUpdatedAt) to reseed bomRows —
      // no manual reselect needed here.
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
  }

  const handleFixedDone = () => {
    qc.invalidateQueries({ queryKey: queryKeys.products.all() })
    qc.invalidateQueries({ queryKey: queryKeys.rmMaster.all() })
    if (selectedProduct) qc.invalidateQueries({ queryKey: queryKeys.recipes.all(selectedProduct.productCode) })
  }

  return (
    <div className="flex h-full rdb-root">
      <ProductSidebar
        productList={productList}
        loading={loading}
        selectedProduct={selectedProduct}
        prodSearch={prodSearch}
        onSearchChange={setProdSearch}
        onSelectProduct={selectProduct}
        onReconcile={() => setReconcileModal(true)}
      />

      <main className="flex-1 flex flex-col overflow-hidden bg-gray-50">
        <BomEditor
          selectedProduct={selectedProduct}
          bomRows={bomRows}
          loadId={loadId}
          rmList={rmList}
          productList={productList}
          microbeList={microbeList}
          saving={bulkSaveRecipe.isPending}
          msg={msg}
          onAddRow={addRow}
          onSaveAll={saveAll}
          onUpdateRow={updateRow}
          onSelectRm={selectRm}
          onRemoveRow={removeRow}
        />
      </main>

      {reconcileModal && (
        <ReconcileModal
          onClose={() => setReconcileModal(false)}
          onFixed={handleFixedDone}
        />
      )}

      <DeleteModal
        open={deleteRowIdx !== null}
        title="Remove RM from Recipe"
        message="This will permanently remove this ingredient from the recipe."
        deleteText="Remove"
        onDelete={confirmRemoveRow}
        onCancel={() => setDeleteRowIdx(null)}
      />
      <ErrorModal
        open={errModal.open}
        message={errModal.message}
        onClose={() => setErrModal({ open: false, message: '' })}
      />
    </div>
  )
}
