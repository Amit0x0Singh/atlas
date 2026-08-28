import { useState, useEffect, useCallback } from 'react'
import { recipeApi, productApi } from '../../../../../api/masters.js'
import { rmApi } from '../../../../../api/inventory.js'
import { planTasksApi } from '../../../../../api/production.js'
import { microbialSfgApi } from '../../../../../api/microbial.js'
import { genId, incrCode, scaleToQty, state as printState } from '../../utils/bomPrintTemplates.js'
import { readArchivedBoms, readMeta, archiveBoms } from '../../utils/bomIssuanceStorage.js'
import { toCanonical } from '../../../../../utils/uom.js'
import { makeRows, toComponents, fromComponents } from '../components-table/ComponentsTable.jsx'
import IssueBomTab from '../issue-bom-tab/page/IssueBomTab.jsx'
import ArchiveTab from '../archive-tab/ArchiveTab.jsx'
import StatusBanner from './components/StatusBanner.jsx'
import BomIssuanceTabs from './components/BomIssuanceTabs.jsx'
import { FileText, Archive } from 'lucide-react'
import { toTitleCase } from '../../../../../utils/textDisplay.js'

const TABS = [
  { id: 'issue',   label: 'Issue BOM', icon: FileText },
  { id: 'archive', label: 'Archive',   icon: Archive },
]

const todayISO = () => new Date().toISOString().slice(0, 10)

// Blank rows shown before a recipe is loaded — once a product resolves the
// table shrinks/grows to exactly that recipe's component count, and the
// "Add Row" button / Excel paste extend it from there.
const DEFAULT_BLANK_ROWS = 8

const emptyForm = () => ({
  product: '', productCode: '',
  diNumber: '', shift: 'A', batchIncharge: '',
  batchNo: '', reactor: '', batchType: 'Commercial',
  batchSize: '', batchSizeUom: 'L',
  dateRequisition: todayISO(), datePlanned: '',
  remarks: '', section: '',
  cycles: 1,
})

const defaultSettings = () => ({
  showTotal: true, inclMasterSheet: true, skipCycleBOMs: false, sectionOnlyBMR: false,
  inclTechnical: false, inclFormulation: true, inclPacking: true, inclCOA: false, inclNano: false,
})

// recipe_db.qtyPerUnit is per 1 KG/L (canonical) of product — so scaleToQty's
// multiplier must be the batch size in that same canonical magnitude, not
// whatever unit the user picked. Entering "2 MT" must scale as 2000, not 2.
function canonicalBatchSize(batchSize, batchSizeUom) {
  const raw = parseFloat(batchSize) || 1
  try {
    return toCanonical(raw, batchSizeUom).qty
  } catch {
    return raw
  }
}

export default function BomIssuance() {
  const [activeTab, setActiveTab] = useState('issue')
  const [form, setForm]     = useState(emptyForm)
  const [rows, setRows]     = useState(() => makeRows(DEFAULT_BLANK_ROWS))
  const [settings, setSettings] = useState(defaultSettings)
  const [error, setError]       = useState('')
  const [generating, setGenerating] = useState(false)
  const [banner, setBanner]     = useState(null) // {type:'success'|'error', msg}

  const [recipeProducts, setRecipeProducts] = useState([])
  const [products, setProducts]             = useState([])
  const [suggestions, setSuggestions]       = useState([])
  const [activeRecipe, setActiveRecipe]     = useState(null) // { productCode, perUnitComponents }
  const [recipeLoadedMsg, setRecipeLoadedMsg] = useState('')
  const [rmList, setRmList]                 = useState([])
  const [microbes, setMicrobes]             = useState([])
  const [savingCorrections, setSavingCorrections] = useState(false)

  const [archivedBoms, setArchivedBoms] = useState(() => readArchivedBoms())
  const [meta, setMeta]                 = useState(() => readMeta())

  useEffect(() => {
    recipeApi.productsSearch().then(r => setRecipeProducts(r.data || [])).catch(() => {})
    rmApi.search({}).then(r => setRmList(r.data || [])).catch(() => {})
    productApi.search().then(r => setProducts(r.data || [])).catch(() => {})
    microbialSfgApi.searchMicrobes().then(r => setMicrobes(r.data || [])).catch(() => {})
  }, [])

  // Keep the shared print-template settings singleton in sync with the React toggles.
  useEffect(() => { Object.assign(printState, settings) }, [settings])

  // Nano batches always get the 4 Nano batch report pages instead of the
  // generic Technical/Formulation/Packing/COA sheets — mirrors the legacy
  // tool's onSectionChange() behavior.
  useEffect(() => {
    setSettings(s => {
      if (form.section === 'Nano') {
        if (s.inclNano && !s.inclTechnical && !s.inclFormulation && !s.inclPacking && !s.inclCOA) return s
        return { ...s, inclNano: true, inclTechnical: false, inclFormulation: false, inclPacking: false, inclCOA: false }
      }
      if (!s.inclNano) return s
      return { ...s, inclNano: false }
    })
  }, [form.section])

  const onProductSearch = useCallback((val) => {
    if (!val.trim()) { setSuggestions([]); return }
    const q = val.toLowerCase()
    setSuggestions(recipeProducts.filter(p => p.productName?.toLowerCase().includes(q)).slice(0, 15))
  }, [recipeProducts])

  const onSelectProduct = useCallback(async (productCode, productName) => {
    setForm(f => ({ ...f, product: productName, productCode }))
    try {
      const r = await recipeApi.list({ productCode })
      const perUnit = (r.data || []).map(l => ({
        sno: '', component: toTitleCase(l.rmName), qty: String(l.qtyPerUnit), uom: l.uom || '', remarks: l.roleType || '', isHeader: false,
        rmCode: l.rmCode,
        // CFU/g concentration for microbe components — a fixed potency, not
        // scaled by batch size (scaleToQty only touches qty).
        cfu: l.requiredCfu != null && l.requiredCfu !== '' ? String(l.requiredCfu) : '',
      }))
      setActiveRecipe({ productCode, perUnit })
      const bsz = canonicalBatchSize(form.batchSize, form.batchSizeUom)
      const scaled = scaleToQty(perUnit, bsz)
      setRows(fromComponents(scaled, scaled.length))
      setRecipeLoadedMsg(`✓ Recipe loaded from Recipe Master · ${perUnit.length} components · scaled to ${form.batchSize} ${form.batchSizeUom}`)
    } catch (e) {
      setError('Failed to load recipe: ' + e.message)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.batchSize, form.batchSizeUom])

  // Auto-load the recipe whenever the Product Name field ends up holding an
  // exact match from the Recipe Master — not just when a suggestion is
  // clicked. This is what makes "Paste from Schedule" work too, since that
  // fills the field directly without ever going through the dropdown.
  useEffect(() => {
    const name = form.product.trim().toLowerCase()
    if (!name || !recipeProducts.length) return
    const match = recipeProducts.find(p => p.productName?.trim().toLowerCase() === name)
    if (match && match.productCode !== form.productCode) {
      onSelectProduct(match.productCode, toTitleCase(match.productName))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.product, form.productCode, recipeProducts])

  // Clear a stale "recipe loaded" message once the typed name no longer
  // matches the product it came from (e.g. user edits the field afterward).
  // Also drops the loaded recipe/components once the Product Name field is
  // fully cleared — otherwise the previous product's BOM keeps sitting in
  // the table below with no product selected, looking like it belongs to
  // nothing. Manually-typed/pasted components (no recipe ever loaded) are
  // left alone — this only resets rows that came from a loaded recipe.
  useEffect(() => {
    if (form.productCode) return
    setRecipeLoadedMsg('')
    if (!form.product.trim() && activeRecipe) {
      setActiveRecipe(null)
      setRows(prev => makeRows(prev.length))
    }
  }, [form.productCode, form.product, activeRecipe])

  // Batch UOM isn't a free choice — it's the product's own unit from Product
  // Master. Lock `batchSizeUom` to that the moment a product resolves (and
  // also once the products list finishes loading, if that lands later).
  useEffect(() => {
    if (!form.productCode || !products.length) return
    const p = products.find((x) => x.productCode === form.productCode)
      || products.find((x) => (x.productName || '').trim().toLowerCase() === form.product.trim().toLowerCase())
    if (p?.uom && p.uom !== form.batchSizeUom) {
      setForm((f) => ({ ...f, batchSizeUom: p.uom }))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.productCode, products])

  // Re-scale the loaded recipe whenever batch size changes
  useEffect(() => {
    if (!activeRecipe) return
    const bsz = canonicalBatchSize(form.batchSize, form.batchSizeUom)
    const scaled = scaleToQty(activeRecipe.perUnit, bsz)
    setRows(prev => fromComponents(scaled, prev.length))
    setRecipeLoadedMsg(`✓ Recipe scaled to ${form.batchSize} ${form.batchSizeUom} (stored per 1 unit)`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.batchSize, form.batchSizeUom])

  // Renames a recipe_db rmCode to the RM Master or Product Master (SFG) item
  // the user's corrected component text actually matched — same mechanism as
  // Recipe Master's own "Fix RM Mapping" tool, just surfaced here where the
  // mismatch is spotted. Reassigns every recipe row using the old code
  // across all products, not just the one currently loaded (the banner in
  // ComponentsTable says so).
  const handleSaveCorrections = async (corrections) => {
    if (!corrections.length) return
    setSavingCorrections(true)
    setBanner({ type: 'loading', msg: `Saving ${corrections.length} correction(s) to Recipe Master…` })
    try {
      const res = await recipeApi.fixRmMapping(corrections)
      setBanner({ type: 'success', msg: `✓ ${res.totalFixed || 0} recipe row(s) updated across all products using the old code(s)` })
      setRows(prev => prev.map(r => {
        const hit = corrections.find(c => c.fromCode === r.rmCode)
        return hit ? { ...r, rmCode: hit.toCode } : r
      }))
      rmApi.search({}).then(r => setRmList(r.data || [])).catch(() => {})
    } catch (e) {
      setBanner({ type: 'error', msg: `Failed to save corrections: ${e.message}` })
    } finally {
      setSavingCorrections(false)
    }
  }

  const onGenerate = async () => {
    setError('')
    const pn = form.product.trim()
    const comps = toComponents(rows)
    if (!pn) return setError('Product name is required')
    if (!form.batchSize || parseFloat(form.batchSize) <= 0) return setError('Batch Size is required and must be greater than 0')
    if (!form.section) return setError('Select the plant this batch will be produced in')
    if (!comps.length) return setError('Add at least one component')

    // The product itself must exist in Product Master before it can be
    // planned — a task created for a product Master doesn't know about has
    // no product code to hang off, so Material Issue by BOM later can't
    // resolve its recipe and silently misbehaves (e.g. pulling every
    // product's BOM rows instead of just this one).
    const productByNameLower = new Map(products.map(p => [(p.productName || '').trim().toLowerCase(), p]))
    if (!productByNameLower.has(pn.toLowerCase())) {
      return setError(
        `Product "${pn}" is not present in Product Master. Add it in Product Master first, then try again.`
      )
    }

    // Every real component (not a section header) must resolve to a Raw
    // Material Master item, a Microbe Master item, OR a Product Master item
    // by exact name — a component can legitimately be an SFG (semi-finished
    // good) used as an ingredient in another product's recipe, in which case
    // it matches Product Master by product code instead of RM Master; or a
    // microbial culture, matching Microbe Master instead (Store never issues
    // these — they route to Microbe Outward). Same check ComponentsTable
    // shows as a red "NAN" Item Code. Blocking here instead of just flagging
    // it visually is deliberate: an unresolved component means Material
    // Issue by BOM won't know which stock to deduct, so the batch can't be
    // planned until it's fixed (rename the component to match one of the
    // three masters exactly, or add the missing item first).
    const rmByNameLower = new Map(rmList.map(rm => [(rm.itemName || '').trim().toLowerCase(), rm]))
    const productByNameLowerForComps = new Map(products.map(p => [(p.productName || '').trim().toLowerCase(), p]))
    const microbeByNameLowerForComps = new Map(microbes.map(m => [(m.microbeName || '').trim().toLowerCase(), m]))
    const unmatched = comps.filter(c => {
      if (c.isHeader || !c.component) return false
      const key = c.component.trim().toLowerCase()
      return !rmByNameLower.has(key) && !productByNameLowerForComps.has(key) && !microbeByNameLowerForComps.has(key)
    })
    if (unmatched.length) {
      return setError(
        `${unmatched.length} component${unmatched.length !== 1 ? 's' : ''} don't match any Raw Material Master, Product Master, or Microbe Master item (shown as "NAN" in Item Code): ${unmatched.map(c => c.component).join(', ')}. ` +
        `Fix the name to match one of those masters exactly, or add the item first, then try again.`
      )
    }

    setGenerating(true)
    const n = Math.max(1, parseInt(form.cycles, 10) || 1)
    const batchBase = form.batchNo.trim() || 'BAT/001'
    // BOM No is no longer entered by hand — auto-generated from today's date
    // plus a short random tag, then incremented per cycle like the batch no.
    const bomBase = `BOM-${form.dateRequisition.replace(/-/g, '')}-${genId().slice(0, 4).toUpperCase()}-001`
    const built = Array.from({ length: n }, (_, i) => ({
      id: genId(),
      bomNo: incrCode(bomBase, i),
      batchNo: incrCode(batchBase, i),
      productName: pn, batchSize: form.batchSize, batchSizeUom: form.batchSizeUom,
      diNumber: form.diNumber, batchType: form.batchType,
      dateRequisition: form.dateRequisition, datePlanned: form.datePlanned,
      shift: form.shift, batchIncharge: form.batchIncharge, reactor: form.reactor,
      remarks: form.remarks, components: comps, section: form.section,
      cycleNo: i + 1, totalCycles: n,
      issuedAt: new Date().toISOString(),
    }))

    setBanner({ type: 'loading', msg: `Creating ${built.length} production task(s)…` })
    try {
      for (const bom of built) {
        const plant = bom.section
        const date  = bom.datePlanned || new Date().toISOString().slice(0, 10)
        await planTasksApi.create({
          plant, date,
          productName: bom.productName,
          batchCode:   bom.batchNo || null,
          qty:         parseFloat(bom.batchSize) || 0,
          qtyUom:      bom.batchSizeUom || 'KG',
          diNo:        bom.diNumber || null,
          shift:       bom.shift || 'General',
          incharge:    bom.batchIncharge || '',
          equipment:   bom.reactor || null,
          process:     'Formulation',
          remarks:     [bom.bomNo, bom.remarks].filter(Boolean).join(' · ') || null,
          sent:        true,
        })
      }
      const newMeta = archiveBoms(built)
      setArchivedBoms(readArchivedBoms())
      setMeta(newMeta)
      setBanner({ type: 'success', msg: `✓ ${built.length} production task(s) created — visible in Store Outward → Material Issue by BOM` })

      // Clear the form for the next entry
      setForm(emptyForm())
      setRows(makeRows(DEFAULT_BLANK_ROWS))
      setActiveRecipe(null)
      setRecipeLoadedMsg('')
    } catch (e) {
      setBanner({ type: 'error', msg: `Failed to create tasks: ${e.message}` })
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <StatusBanner banner={banner} onDismiss={() => setBanner(null)} />

      <BomIssuanceTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'issue' && (
          <IssueBomTab
            form={form} setForm={setForm} rows={rows} setRows={setRows}
            settings={settings} setSettings={setSettings}
            productSuggestions={suggestions} onProductSearch={onProductSearch} onSelectProduct={onSelectProduct}
            recipeLoadedMsg={recipeLoadedMsg}
            onGenerate={onGenerate} generating={generating} error={error}
            rmList={rmList} products={products} microbes={microbes} onSaveCorrections={handleSaveCorrections} savingCorrections={savingCorrections}
          />
        )}
        {activeTab === 'archive' && (
          <ArchiveTab boms={archivedBoms} recipeCount={recipeProducts.length} meta={meta} />
        )}
      </div>
    </div>
  )
}
