import { useState, useEffect, useMemo, useRef } from 'react'
import { GitBranch, FlaskConical } from 'lucide-react'
import { DeleteModal, ErrorModal, PageHeader, BackButton } from '../../../../components/ui'
import ProductRecipeSearch from '../components/product-search/ProductRecipeSearch.jsx'
import RecipeLanding        from '../components/product-search/RecipeLanding.jsx'
import RecipeTabs        from '../components/recipe-tabs/RecipeTabs.jsx'
import BomEditor         from '../components/bom-editor/page/BomEditor.jsx'
import { useProducts } from '../../../../hooks/masters/useProducts.js'
import { useRmMaster } from '../../../../hooks/inventory/useRmMaster.js'
import { useMicrobes } from '../../../../hooks/masters/useMicrobes.js'
import { useRecipe, useBulkSaveRecipe, useDeleteRecipeRow, useRenameRecipe, useDeleteRecipe } from '../../../../hooks/masters/useRecipes.js'
import { toTitleCase } from '../../../../utils/textDisplay.js'

const EMPTY_ROW = () => ({ id: null, rmCode: '', rmName: '', qtyPerUnit: '', uom: 'KG', roleType: 'INGREDIENT', isMicrobe: false, microbeCode: null, requiredCfu: '', _dirty: true })

const RECENT_KEY = 'erp_recipe_recent'
const readRecent = () => {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY)); return Array.isArray(v) ? v : [] }
  catch { return [] }
}

export default function RecipeDB() {
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedRecipeNo, setSelectedRecipeNo] = useState(1)
  const [draftRecipeNo, setDraftRecipeNo] = useState(null)
  const [recipeName, setRecipeName] = useState('')
  const [bomRows, setBomRows]             = useState([])
  const [recentCodes, setRecentCodes]    = useState(readRecent)
  const [msg, setMsg]                     = useState({ type: '', text: '' })
  const [deleteRowIdx, setDeleteRowIdx]   = useState(null)
  const [deleteRecipeNo, setDeleteRecipeNo] = useState(null)
  const [errModal, setErrModal]           = useState({ open: false, message: '' })
  const [loadId, setLoadId] = useState(0)

  const { data: productResult, isLoading: productsLoading } = useProducts()
  const productList = productResult?.items ?? []
  const { data: rmList = [] } = useRmMaster()
  const { data: microbeList = [] } = useMicrobes()
  const loading = productsLoading

  const recipeQuery = useRecipe(selectedProduct?.productCode)
  const bulkSaveRecipe = useBulkSaveRecipe()
  const deleteRecipeRow = useDeleteRecipeRow()
  const renameRecipeMut = useRenameRecipe()
  const deleteRecipeMut = useDeleteRecipe()

  // All rows for the product, grouped into its recipes (one group per recipeNo).
  const groups = useMemo(() => {
    const m = new Map()
    for (const r of recipeQuery.data || []) {
      if (!m.has(r.recipeNo)) m.set(r.recipeNo, { recipeNo: r.recipeNo, recipeName: r.recipeName || null, rows: [] })
      const g = m.get(r.recipeNo)
      g.rows.push(r)
      if (r.recipeName) g.recipeName = r.recipeName
    }
    return [...m.values()].sort((a, b) => a.recipeNo - b.recipeNo)
  }, [recipeQuery.data])

  const dirty = bomRows.some(r => r._dirty)

  const recipeTabs = useMemo(() => {
    const tabs = groups.map(g => ({ recipeNo: g.recipeNo, recipeName: g.recipeName, rowCount: g.rows.length, isDraft: false }))
    if (draftRecipeNo != null && !groups.some(g => g.recipeNo === draftRecipeNo)) {
      tabs.push({ recipeNo: draftRecipeNo, recipeName: recipeName || null, rowCount: 0, isDraft: true })
    }
    return tabs
  }, [groups, draftRecipeNo, recipeName])

  // A saved recipe took over a draft's number — the draft is now real.
  useEffect(() => {
    if (draftRecipeNo != null && groups.some(g => g.recipeNo === draftRecipeNo)) setDraftRecipeNo(null)
  }, [groups, draftRecipeNo])

  // Once a product's recipes load, snap the selection to a real recipe if the
  // current one doesn't exist (and isn't the pending draft).
  useEffect(() => {
    if (!selectedProduct || recipeQuery.isLoading) return
    if (draftRecipeNo != null) return
    const nos = groups.map(g => g.recipeNo)
    if (nos.length && !nos.includes(selectedRecipeNo)) setSelectedRecipeNo(nos[0])
  }, [selectedProduct, groups, recipeQuery.isLoading, selectedRecipeNo, draftRecipeNo])

  // Seed the editable bomRows draft for the selected recipe — on product
  // select, recipe switch, or a refetch after save. A draft recipe's rows
  // are owned by newRecipe(), never reseeded here.
  const seededForRef = useRef(null)
  useEffect(() => {
    if (!selectedProduct || recipeQuery.isLoading) return
    const key = `${selectedProduct.productCode}:${selectedRecipeNo}:${recipeQuery.dataUpdatedAt}`
    if (seededForRef.current === key) return
    seededForRef.current = key
    const g = groups.find(x => x.recipeNo === selectedRecipeNo)
    if (!g && selectedRecipeNo === draftRecipeNo) return
    setBomRows(g && g.rows.length ? g.rows.map(r => ({ ...r, _dirty: false })) : [EMPTY_ROW()])
    setRecipeName(g?.recipeName || '')
    setLoadId(id => id + 1)
  }, [selectedProduct, selectedRecipeNo, groups, recipeQuery.dataUpdatedAt, recipeQuery.isLoading, draftRecipeNo])

  const selectProduct = (prod) => {
    if (dirty && !window.confirm('Discard unsaved changes to this recipe?')) return
    setSelectedProduct(prod)
    setBomRows([])
    setDraftRecipeNo(null)
    setSelectedRecipeNo(1)
    setRecipeName('')
    setMsg({ type: '', text: '' })
    seededForRef.current = null
    if (prod?.productCode) {
      setRecentCodes(prev => {
        const next = [prod.productCode, ...prev.filter(c => c !== prod.productCode)].slice(0, 6)
        try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)) } catch { /* storage unavailable */ }
        return next
      })
    }
  }

  const backToSearch = () => {
    if (dirty && !window.confirm('Discard unsaved changes to this recipe?')) return
    setSelectedProduct(null)
    setBomRows([])
    setDraftRecipeNo(null)
    setSelectedRecipeNo(1)
    setRecipeName('')
    setMsg({ type: '', text: '' })
    seededForRef.current = null
  }

  const selectRecipe = (no) => {
    if (no === selectedRecipeNo) return
    if (dirty && !window.confirm('Discard unsaved changes to this recipe?')) return
    // leaving an untouched draft — drop it
    if (draftRecipeNo != null && draftRecipeNo !== no && bomRows.every(r => !r.rmCode)) setDraftRecipeNo(null)
    setSelectedRecipeNo(no)
    setMsg({ type: '', text: '' })
  }

  const newRecipe = () => {
    const maxNo = groups.reduce((m, g) => Math.max(m, g.recipeNo), 0)
    const n = Math.max(maxNo, draftRecipeNo || 0) + 1
    setDraftRecipeNo(n)
    setSelectedRecipeNo(n)
    setBomRows([EMPTY_ROW()])
    setRecipeName('')
    setMsg({ type: '', text: '' })
  }

  const renameRecipe = (name) => {
    setRecipeName(name)
    const isDraft = !groups.some(g => g.recipeNo === selectedRecipeNo)
    if (!isDraft && selectedProduct) {
      renameRecipeMut.mutate({ productCode: selectedProduct.productCode, recipeNo: selectedRecipeNo, recipeName: name })
    }
  }

  const requestDeleteRecipe = (no, isDraft) => {
    if (isDraft) {
      setDraftRecipeNo(null)
      setSelectedRecipeNo(groups[0]?.recipeNo ?? 1)
      setBomRows([])
      return
    }
    setDeleteRecipeNo(no)
  }

  const confirmDeleteRecipe = async () => {
    const no = deleteRecipeNo
    setDeleteRecipeNo(null)
    try {
      await deleteRecipeMut.mutateAsync({ productCode: selectedProduct.productCode, recipeNo: no })
      const remaining = groups.map(g => g.recipeNo).filter(n => n !== no)
      setSelectedRecipeNo(remaining[0] ?? 1)
      setBomRows([])
      seededForRef.current = null
      setMsg({ type: 'success', text: 'Recipe deleted' })
    } catch (e) { setErrModal({ open: true, message: e.message }) }
  }

  const updateRow = (idx, field, value) => {
    setBomRows(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value, _dirty: true } : r))
  }

  const selectRm = (idx, picked, kind = 'rm') => {
    const code = kind === 'product' ? picked.productCode : kind === 'microbe' ? picked.microbeCode : picked.itemCode
    const name = toTitleCase(kind === 'product' ? picked.productName : kind === 'microbe' ? picked.microbeName : picked.itemName)
    setBomRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      if (kind === 'microbe') {
        return { ...r, rmCode: code, rmName: name, roleType: 'MICROBE', isMicrobe: true, microbeCode: code, _dirty: true }
      }
      return {
        ...r, rmCode: code, rmName: name, uom: kind === 'product' ? r.uom : picked.inventoryUom,
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
        recipeNo: selectedRecipeNo,
        recipeName: recipeName.trim() || null,
        rmCode: r.rmCode, rmName: r.rmName,
        qtyPerUnit: r.qtyPerUnit, uom: r.uom,
        roleType: r.roleType || 'INGREDIENT',
        isMicrobe: r.isMicrobe || false,
        microbeCode: r.microbeCode || null,
        requiredCfu: r.requiredCfu !== '' && r.requiredCfu != null ? r.requiredCfu : null,
      }))
      const res = await bulkSaveRecipe.mutateAsync(payload)
      setMsg({ type: 'success', text: `✅ ${res.saved} rows saved` })
    } catch (e) { setMsg({ type: 'error', text: e.message }) }
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <PageHeader
        icon={GitBranch}
        title="Recipes"
        description="Build and manage the bill of materials for each product."
        actions={
          // While a product is open, Back returns to the product search
          // instead of leaving the page entirely.
          selectedProduct
            ? <BackButton onClick={backToSearch} />
            : <BackButton />
        }
      >
        {selectedProduct && (
          <div className="flex items-center justify-between gap-4 flex-wrap rounded-xl border border-gray-200 bg-gray-50/70 px-3 py-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="shrink-0 w-8 h-8 rounded-lg bg-white border border-gray-200 text-indigo-600 grid place-items-center">
                <FlaskConical size={15} strokeWidth={2.2} />
              </span>
              <div className="min-w-0 leading-tight">
                <div className="text-sm font-bold text-gray-900 truncate">{toTitleCase(selectedProduct.productName)}</div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-mono text-gray-400">{selectedProduct.productCode}</span>
                  {selectedProduct.plant?.length > 0 && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1 py-px">
                      {selectedProduct.plant.join(' · ')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Switch to another product without leaving the editor */}
            <ProductRecipeSearch
              productList={productList}
              loading={loading}
              onSelect={selectProduct}
              size="sm"
              placeholder="Switch product…"
            />
          </div>
        )}
      </PageHeader>

      {!selectedProduct ? (
        <RecipeLanding
          productList={productList}
          loading={loading}
          recentCodes={recentCodes}
          onSelect={selectProduct}
        />
      ) : (
        <main className="flex-1 flex flex-col overflow-hidden">
          <RecipeTabs
            recipes={recipeTabs}
            activeNo={selectedRecipeNo}
            activeName={recipeName}
            dirty={dirty}
            onSelect={selectRecipe}
            onNew={newRecipe}
            onRename={renameRecipe}
            onDelete={requestDeleteRecipe}
          />

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
      )}

      <DeleteModal
        open={deleteRowIdx !== null}
        title="Remove RM from Recipe"
        message="This will permanently remove this ingredient from the recipe."
        deleteText="Remove"
        onDelete={confirmRemoveRow}
        onCancel={() => setDeleteRowIdx(null)}
      />
      <DeleteModal
        open={deleteRecipeNo !== null}
        title={`Delete ${recipeName || `Recipe ${deleteRecipeNo}`}`}
        message="This permanently removes every ingredient in this recipe. Other recipes for this product are not affected."
        deleteText="Delete recipe"
        onDelete={confirmDeleteRecipe}
        onCancel={() => setDeleteRecipeNo(null)}
      />
      <ErrorModal
        open={errModal.open}
        message={errModal.message}
        onClose={() => setErrModal({ open: false, message: '' })}
      />
    </div>
  )
}
