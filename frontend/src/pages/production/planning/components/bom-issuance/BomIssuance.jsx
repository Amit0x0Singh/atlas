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
import { SuccessModal } from '../../../../../components/ui/index.js'
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
  // Per-field validation errors shown under each input in Batch Details.
  const [fieldErrors, setFieldErrors] = useState({})
  const [generating, setGenerating] = useState(false)
  const [banner, setBanner]     = useState(null) // {type:'success'|'error', msg}

  const [recipeProducts, setRecipeProducts] = useState([])
  const [products, setProducts]             = useState([])
  const [suggestions, setSuggestions]       = useState([])
  const [activeRecipe, setActiveRecipe]     = useState(null) // { productCode, perUnit }
  // A product can hold several named recipes — [{ recipeNo, recipeName, lines }].
  const [productRecipes, setProductRecipes] = useState([])
  const [selectedRecipeNo, setSelectedRecipeNo] = useState(null)
  const [recipeLoadedMsg, setRecipeLoadedMsg] = useState('')
  const [rmList, setRmList]                 = useState([])
  const [microbes, setMicrobes]             = useState([])

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

  // Turn one recipe's stored lines into the scaled component-table rows.
  const applyRecipeLines = useCallback((lines, productCode, label) => {
    const perUnit = (lines || []).map(l => ({
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
    setRecipeLoadedMsg(`✓ ${label} · ${perUnit.length} components · scaled to ${form.batchSize} ${form.batchSizeUom}`)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.batchSize, form.batchSizeUom])

  const onSelectProduct = useCallback(async (productCode, productName) => {
    setForm(f => ({ ...f, product: productName, productCode }))
    try {
      const r = await recipeApi.list({ productCode })
      // Group the flat rows into recipes by recipeNo.
      const byNo = new Map()
      for (const l of r.data || []) {
        if (!byNo.has(l.recipeNo)) byNo.set(l.recipeNo, { recipeNo: l.recipeNo, recipeName: l.recipeName || null, lines: [] })
        const g = byNo.get(l.recipeNo)
        g.lines.push(l)
        if (l.recipeName) g.recipeName = l.recipeName
      }
      const recipes = [...byNo.values()].sort((a, b) => a.recipeNo - b.recipeNo)
      setProductRecipes(recipes)

      const first = recipes[0]
      setSelectedRecipeNo(first?.recipeNo ?? null)
      const label = recipes.length > 1
        ? `Recipe loaded: ${first?.recipeName || `Recipe ${first?.recipeNo}`} (${recipes.length} available)`
        : 'Recipe loaded from Recipe Master'
      applyRecipeLines(first?.lines || [], productCode, label)
    } catch (e) {
      setError('Failed to load recipe: ' + e.message)
    }
  }, [applyRecipeLines])

  // Operator switched recipes in the picker.
  const pickRecipe = useCallback((recipeNo) => {
    const g = productRecipes.find(x => x.recipeNo === recipeNo)
    if (!g) return
    setSelectedRecipeNo(recipeNo)
    applyRecipeLines(g.lines, form.productCode, `Recipe: ${g.recipeName || `Recipe ${g.recipeNo}`}`)
  }, [productRecipes, form.productCode, applyRecipeLines])

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
      setProductRecipes([])
      setSelectedRecipeNo(null)
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

  const onGenerate = async () => {
    setError('')
    const pn = form.product.trim()
    const comps = toComponents(rows)

    // Required-field checks surface under the field itself (Batch Details),
    // not just as a single banner — one pass so every missing field lights up.
    const fe = {}
    if (!pn) fe.product = 'Product name is required'
    if (!form.batchNo.trim()) fe.batchNo = 'Batch No is required'
    if (!form.batchSize || parseFloat(form.batchSize) <= 0) fe.batchSize = 'Batch Size is required and must be greater than 0'
    if (!form.section) fe.section = 'Select the plant this batch will be produced in'
    setFieldErrors(fe)
    if (Object.keys(fe).length) {
      return setError('Please fill in the required fields highlighted below')
    }

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

    // Components are loaded straight from the product's stored recipe, so
    // each line already carries the master item code (rmCode) it resolves
    // to. A missing or "NaN" code means that recipe row was never mapped to
    // a real Raw Material / SFG / Microbe master item — Material Issue by BOM
    // then won't know which stock to deduct, so block until it's fixed in
    // the Recipe page.
    const unmatched = comps.filter(c => {
      if (c.isHeader || !c.component) return false
      return !c.rmCode || /^nan/i.test(String(c.rmCode))
    })
    if (unmatched.length) {
      return setError(
        `${unmatched.length} recipe component${unmatched.length !== 1 ? 's' : ''} ${unmatched.length !== 1 ? 'are' : 'is'} not mapped to a master item (shown as "NAN"): ${unmatched.map(c => c.component).join(', ')}. ` +
        `Open this product on the Recipe page and re-select those items from Item / Microbe / Product Master, then try again.`
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
          // Persist which product + recipe this task was planned against so
          // Microbe Outward / Material Issue by BOM issue the exact recipe
          // that was selected here, not the product's primary one.
          productCode: form.productCode || null,
          recipeNo:    selectedRecipeNo ?? null,
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
      setBanner({ type: 'success', msg: `${built.length} production task(s) created — now visible in Store Outward → Material Issue by BOM.` })

      // Clear the form for the next entry
      setForm(emptyForm())
      setRows(makeRows(DEFAULT_BLANK_ROWS))
      setActiveRecipe(null)
      setRecipeLoadedMsg('')
      setFieldErrors({})
    } catch (e) {
      setBanner({ type: 'error', msg: `Failed to create tasks: ${e.message}` })
    } finally {
      setGenerating(false)
    }
  }

  const isSuccess = banner?.type === 'success'

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Loading / error stay as an inline strip; success is a popup so it
          can't be missed and doesn't shove the form down. */}
      <StatusBanner banner={isSuccess ? null : banner} onDismiss={() => setBanner(null)} />

      <SuccessModal
        open={isSuccess}
        title="BOM Issued"
        message={isSuccess ? banner.msg : ''}
        buttonText="Done"
        onClose={() => setBanner(null)}
      />

      <BomIssuanceTabs tabs={TABS} activeTab={activeTab} onChange={setActiveTab} />

      <div className="flex-1 overflow-y-auto">
        {activeTab === 'issue' && (
          <IssueBomTab
            form={form} setForm={setForm} rows={rows} setRows={setRows}
            settings={settings} setSettings={setSettings}
            productSuggestions={suggestions} onProductSearch={onProductSearch} onSelectProduct={onSelectProduct}
            recipeLoadedMsg={recipeLoadedMsg}
            productRecipes={productRecipes} selectedRecipeNo={selectedRecipeNo} onPickRecipe={pickRecipe}
            onGenerate={onGenerate} generating={generating} error={error}
            fieldErrors={fieldErrors} setFieldErrors={setFieldErrors}
            rmList={rmList} products={products} microbes={microbes}
          />
        )}
        {activeTab === 'archive' && (
          <ArchiveTab boms={archivedBoms} recipeCount={recipeProducts.length} meta={meta} />
        )}
      </div>
    </div>
  )
}
