import { useState, useEffect, useCallback } from 'react'
import { outwardApi, containerApi, rmApi } from '../../../../../../../api/inventory.js'
import { recipeApi, productApi } from '../../../../../../../api/masters.js'
import { planTasksApi } from '../../../../../../../api/production.js'
import { useIsMobile } from '../../../../../../../hooks/useIsMobile.js'
import { convertByDensity } from '../../../../../../../utils/uom.js'
import SelectStep from '../components/SelectStep.jsx'
import BomChecklistStep from '../components/BomChecklistStep.jsx'
import './MaterialIssueByBOM.css'

import { toTitleCase } from '../../../../../../../utils/textDisplay.js'
export default function MaterialIssueByBOM({ resumeSessionId, onAutoResumed }) {
  const isMobile = useIsMobile()

  // ─── Step / product selection ──────────────────────────────────────────
  const [step, setStep]             = useState('select')
  const [products, setProducts]     = useState([])
  const [selProduct, setSelProduct] = useState(null)
  const [selTaskId, setSelTaskId]   = useState(null)
  const [batchQty, setBatchQty]     = useState('')
  const [batchUom, setBatchUom]     = useState('KG')
  const [batchRef, setBatchRef]     = useState('')
  const [diNo,     setDiNo]         = useState('')
  const [loadingBom, setLoadingBom] = useState(false)
  const [error, setError]           = useState('')

  // Production task picker
  const [tasks,        setTasks]        = useState([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  // Date defaults to blank ("All Dates") — a task planned yesterday and not
  // yet issued must stay visible today. Defaulting this to today's date used
  // to silently hide every still-pending task from a previous day.
  const [taskFilter,   setTaskFilter]   = useState({ plant: '', date: '' })

  // ─── Session ──────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState(null)

  // ─── BOM ──────────────────────────────────────────────────────────────────
  const [bomLines, setBomLines] = useState([])
  // Set once per session-entry to whatever the live recipe_db looks like at
  // that moment, compared against the frozen bomLines snapshot — surfaces
  // recipe edits made *after* this session (or an old resumed session) was
  // started, instead of silently showing outdated ingredients with no signal.
  const [recipeDrift, setRecipeDrift] = useState(null) // { added, removed, changed, current } | null

  // ─── Issue panel ─────────────────────────────────────────────────────────
  const [activeIdx, setActiveIdx]   = useState(null)
  // pre-loaded silently for scan matching (never shown as dropdowns)
  const [packs, setPacks]           = useState([])
  const [containers, setContainers] = useState([])
  const [loadingRes, setLoadingRes] = useState(false)
  // scan state
  const [scanErr, setScanErr]       = useState('')
  const [foundSource, setFoundSource] = useState(null)
  // foundSource: { type:'pack'|'container', id, availableQty, uom, lotNo?, bagNo?, supplier?, itemName? }
  const [issueQty, setIssueQty]     = useState('')
  const [issuing, setIssuing]       = useState(false)
  const [issueError, setIssueError] = useState('')
  const [lineMsg, setLineMsg]       = useState({})

  // Load products
  useEffect(() => {
    productApi.list().then(r => setProducts(r.data || [])).catch(() => {})
  }, [])

  // RM master lookup — used only to know each line's Operational UOM/density
  // for display and default-qty conversion; the server always re-derives and
  // validates the actual conversion before deducting stock.
  const [rmByCode, setRmByCode] = useState(new Map())
  useEffect(() => {
    rmApi.list().then(r => setRmByCode(new Map((r.data || []).map(rm => [rm.itemCode, rm])))).catch(() => {})
  }, [])

  // The unit the operator should enter a line's issue qty in — Operational
  // UOM when the RM has one configured, otherwise the same unit shown for
  // "Required"/"Issued" (Inventory UOM). Falls back to the line's own uom
  // when the code isn't in RM Master (e.g. an SFG ingredient).
  const entryUomFor = useCallback((line) => {
    const rm = rmByCode.get(line.rmCode)
    return rm?.operationalUom || rm?.inventoryUom || line.uom
  }, [rmByCode])

  // Best-effort conversions for display/default-qty purposes only — fall
  // back to the raw qty unchanged when conversion isn't possible (same
  // unit, RM not found, or missing density). The server always re-derives
  // and validates the real conversion before deducting stock.
  const toEntryQty = useCallback((line, inventoryQty) => {
    const rm = rmByCode.get(line.rmCode)
    if (!rm) return inventoryQty
    try { return convertByDensity(inventoryQty, rm.inventoryUom, entryUomFor(line), rm.density).qty }
    catch { return inventoryQty }
  }, [rmByCode, entryUomFor])

  const toInventoryQty = useCallback((line, entryQty) => {
    const rm = rmByCode.get(line.rmCode)
    if (!rm) return entryQty
    try { return convertByDensity(entryQty, entryUomFor(line), rm.inventoryUom, rm.density).qty }
    catch { return entryQty }
  }, [rmByCode, entryUomFor])

  // `remaining` (required - issued) is in line.uom — the recipe's own
  // declared unit — which isn't guaranteed to be the same unit as entryUom
  // (RM Master's Operational UOM); they usually match but aren't the same
  // field. Converts a line.uom-scale qty into entryUom so it can be safely
  // compared/combined with pack/container quantities once those have
  // likewise been converted via toEntryQty (which starts from Inventory
  // UOM instead) — two different source units both landing on entryUom.
  const lineUomToEntryQty = useCallback((line, lineQty) => {
    const rm = rmByCode.get(line.rmCode)
    if (!rm) return lineQty
    try { return convertByDensity(lineQty, line.uom, entryUomFor(line), rm.density).qty }
    catch { return lineQty }
  }, [rmByCode, entryUomFor])

  // Load production tasks
  useEffect(() => {
    setLoadingTasks(true)
    planTasksApi.list().then(r => setTasks(r.data || [])).catch(() => {}).finally(() => setLoadingTasks(false))
  }, [])

  const filteredTasks = tasks.filter(t =>
    t.sent &&
    t.status !== 'Completed' &&
    !t.bomIssueStarted &&
    (!taskFilter.plant || t.plant === taskFilter.plant) &&
    (!taskFilter.date  || t.date  === taskFilter.date)
  )

  function selectTask(task) {
    const match = products.find(p =>
      p.productName?.toLowerCase() === task.productName?.toLowerCase() ||
      (task.productCode && p.productCode === task.productCode)
    )
    setSelProduct(match || { productCode: task.productCode || '', productName: task.productName })
    setBatchQty(String(task.qty || ''))
    setBatchUom(task.qtyUom || 'KG')
    setBatchRef(task.batchCode || task.taskId || '')
    setDiNo(task.diNo || '')
    setSelTaskId(task.id)
    setError('')
  }

  const clearSelection = () => { setSelProduct(null); setBatchQty(''); setBatchUom('KG'); setBatchRef(''); setDiNo(''); setSelTaskId(null) }

  // Auto-save on every bomLines change — persisted server-side (not just this
  // browser) so the same in-progress session is visible from any device/login.
  useEffect(() => {
    if (!sessionId || step !== 'bom') return
    outwardApi.bomSessions.upsert(sessionId, {
      planTaskId:  selTaskId || null,
      productCode: selProduct?.productCode || '',
      productName: selProduct?.productName || '',
      batchQty, batchUom, batchRef, diNo,
      bomLines,
    }).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bomLines, sessionId])

  // ─── Load BOM ──────────────────────────────────────────────────────────────
  const loadBom = async () => {
    if (!selProduct || !batchQty || parseFloat(batchQty) <= 0) return
    setLoadingBom(true); setError('')
    try {
      const res = await recipeApi.list({ productCode: selProduct.productCode })
      // Microbe ingredients are issued separately on the Microbial Transaction
      // page (against the same recipe) — Store only handles raw materials here.
      const raw = (res.data || []).filter(r => !r.isMicrobe)
      if (raw.length === 0) {
        setError('No raw material BOM found for this product. Add recipe lines in Recipe Master first.')
        setLoadingBom(false); return
      }
      const batch = parseFloat(batchQty)
      const lines = raw.map(r => ({
        rmCode:     r.rmCode,
        rmName:     r.rmName,
        qtyPerUnit: parseFloat(r.qtyPerUnit),
        required:   parseFloat((r.qtyPerUnit * batch).toFixed(3)),
        issued:     0,
        uom:        r.uom || 'KG',
        roleType:   r.roleType || 'INGREDIENT',
      }))
      const id = Date.now().toString()
      setSessionId(id)
      setBomLines(lines)
      setActiveIdx(null)
      setLineMsg({})
      setStep('bom')
      if (selTaskId) {
        planTasksApi.update(selTaskId, { bomIssueStarted: true, bomIssueStartedAt: new Date().toISOString() }).catch(() => {})
        setTasks(prev => prev.map(t => t.id === selTaskId ? { ...t, bomIssueStarted: true } : t))
      }
    } catch (e) { setError(e.message) }
    finally { setLoadingBom(false) }
  }

  // ─── Resume session ───────────────────────────────────────────────────────
  const resumeSession = (s) => {
    setSelProduct({ productCode: s.productCode, productName: s.productName })
    setBatchQty(s.batchQty)
    setBatchUom(s.batchUom || 'KG')
    setBatchRef(s.batchRef || '')
    setDiNo(s.diNo || '')
    setBomLines(s.bomLines)
    setSessionId(s.id)
    setSelTaskId(null)
    setActiveIdx(null)
    setLineMsg({})
    setError('')
    setStep('bom')
  }

  // Resume a session requested from outside (e.g. the BOM Issued history page)
  useEffect(() => {
    if (!resumeSessionId) return
    outwardApi.bomSessions.list()
      .then(r => {
        const s = (r.data || []).find(x => x.id === resumeSessionId)
        if (s) resumeSession(s)
      })
      .catch(() => {})
      .finally(() => onAutoResumed?.())
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeSessionId])

  // ─── Recipe drift detection ────────────────────────────────────────────────
  // Runs once per session-entry (fresh load or resume), diffing the frozen
  // bomLines snapshot against whatever recipe_db currently says for this
  // product — catches both a resumed old session and a recipe edited out
  // from under an active one.
  useEffect(() => {
    if (step !== 'bom' || !selProduct?.productCode) { setRecipeDrift(null); return }
    let cancelled = false
    recipeApi.list({ productCode: selProduct.productCode }).then(res => {
      if (cancelled) return
      // Same microbe exclusion as loadBom — a microbe added/edited in the
      // recipe since this session started must not surface as BOM drift here.
      const current = (res.data || []).filter(r => !r.isMicrobe)
      const currentByCode = new Map(current.map(r => [r.rmCode, r]))
      const sessionCodes  = new Set(bomLines.map(l => l.rmCode))

      const removed = bomLines.filter(l => !currentByCode.has(l.rmCode))
      const added   = current.filter(r => !sessionCodes.has(r.rmCode))
      const changed = bomLines.filter(l => {
        const cur = currentByCode.get(l.rmCode)
        return cur && (cur.rmName !== l.rmName || parseFloat(cur.qtyPerUnit) !== l.qtyPerUnit || (cur.uom || 'KG') !== l.uom)
      })

      setRecipeDrift(removed.length || added.length || changed.length ? { added, removed, changed, current } : null)
    }).catch(() => {})
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, selProduct?.productCode, sessionId])

  // Rebuilds bomLines from the live recipe: matching rmCode keeps its issued
  // qty (and picks up the corrected name/qty/uom/role), new recipe rows are
  // added at 0 issued, and rows dropped from the recipe are kept only if
  // they already have real stock issued against them (flagged `orphaned`,
  // for audit — never silently deleting an already-issued line) or else
  // dropped entirely since there's nothing to reconcile.
  const syncToCurrentRecipe = () => {
    if (!recipeDrift) return
    const { current } = recipeDrift
    const batch = parseFloat(batchQty) || 0
    const existingByCode = new Map(bomLines.map(l => [l.rmCode, l]))

    const merged = current.map(r => {
      const existing = existingByCode.get(r.rmCode)
      return {
        rmCode:     r.rmCode,
        rmName:     r.rmName,
        qtyPerUnit: parseFloat(r.qtyPerUnit),
        required:   parseFloat((r.qtyPerUnit * batch).toFixed(3)),
        issued:     existing?.issued || 0,
        uom:        r.uom || 'KG',
        roleType:   r.roleType || 'INGREDIENT',
      }
    })

    const orphaned = bomLines
      .filter(l => l.issued > 0 && !current.some(r => r.rmCode === l.rmCode))
      .map(l => ({ ...l, orphaned: true }))

    setBomLines([...merged, ...orphaned])
    setRecipeDrift(null)

    // A sync can itself complete the batch (e.g. every real line was already
    // issued and the only drift was a since-removed, never-issued line) —
    // there's no manual Delete button on the history page anymore, so a
    // session left "fully issued" here would otherwise sit stuck forever.
    if (merged.every(l => l.issued >= l.required - 0.001)) outwardApi.bomSessions.delete(sessionId).catch(() => {})
  }

  // ─── Load packs + containers silently (for scan matching only) ───────────
  const loadResources = useCallback(async (rmCode) => {
    setLoadingRes(true)
    setScanErr(''); setFoundSource(null); setIssueQty(''); setIssueError('')
    try {
      const [packsRes, contsRes] = await Promise.allSettled([
        outwardApi.availablePacks(rmCode),
        containerApi.list({ itemCode: rmCode }),
      ])
      setPacks(packsRes.status === 'fulfilled' ? (packsRes.value.data || []) : [])
      setContainers(
        contsRes.status === 'fulfilled'
          ? (contsRes.value.data || []).filter(c => c.currentQty > 0)
          : []
      )
    } finally { setLoadingRes(false) }
  }, [])

  const openIssuePanel = async (idx) => {
    if (activeIdx === idx) { setActiveIdx(null); return }
    setActiveIdx(idx)
    setIssueError('')
    setLineMsg(prev => ({ ...prev, [idx]: '' }))
    await loadResources(bomLines[idx].rmCode)
  }

  // ─── Unified scan handler ────────────────────────────────────────────────
  const handleScan = useCallback((rawValue) => {
    const val = rawValue.trim()
    if (!val) return
    setScanErr('')
    setFoundSource(null)
    setIssueError('')

    const line = bomLines[activeIdx]
    if (!line) return
    const remaining = parseFloat((line.required - line.issued).toFixed(3))
    // remaining is in line.uom — convert it to entryUom separately from the
    // pack/container qty (which starts from Inventory UOM via toEntryQty)
    // before combining with Math.min. Taking Math.min(remaining, stockQty)
    // first and converting the result afterward — the previous approach —
    // silently compared two different units (e.g. 1 L needed vs 98 kg in
    // stock) and could convert the wrong one, producing a "Max" larger than
    // what was actually still needed.
    const remainingInEntryUom = lineUomToEntryQty(line, remaining)

    const entryUom = entryUomFor(line)

    // Container QR encodes "CONT:{containerId}"
    if (val.startsWith('CONT:')) {
      const containerId = val.slice(5)
      const cont = containers.find(c => c.containerId === containerId)
      if (cont) {
        const maxEntryQty = Math.min(remainingInEntryUom, toEntryQty(line, cont.currentQty))
        const rm = rmByCode.get(line.rmCode)
        setFoundSource({ type: 'container', id: cont.containerId, availableQty: cont.currentQty, uom: rm?.inventoryUom || cont.uom || line.uom, entryUom, maxEntryQty, itemName: cont.itemName })
        setIssueQty(String(maxEntryQty.toFixed(3)))
      } else {
        setScanErr(`Container "${containerId}" has no stock for ${toTitleCase(line.rmName)}. Check the container or inward stock first.`)
      }
      return
    }

    // Pack QR encodes raw packId
    const pack = packs.find(p => p.packId === val)
    if (pack) {
      const maxEntryQty = Math.min(remainingInEntryUom, toEntryQty(line, pack.remainingQty))
      // pack.remainingQty is always tracked in the item's Inventory UOM —
      // labeling it with line.uom (the recipe's own declared unit, which
      // can differ, e.g. "L" for a KG-tracked item) showed a real stock
      // number under the wrong unit. rmByCode carries the RM's actual
      // inventoryUom for the correct label.
      const rm = rmByCode.get(line.rmCode)
      setFoundSource({ type: 'pack', id: pack.packId, availableQty: pack.remainingQty, uom: rm?.inventoryUom || line.uom, entryUom, maxEntryQty, lotNo: pack.lotNo, bagNo: pack.bagNo, supplier: pack.supplier })
      setIssueQty(String(maxEntryQty.toFixed(3)))
      return
    }

    setScanErr(`"${val}" not found for ${toTitleCase(line.rmName)}. Scan the correct pack or container QR code.`)
  }, [bomLines, activeIdx, packs, containers, entryUomFor, toEntryQty, lineUomToEntryQty, rmByCode])

  // ─── Submit issue ────────────────────────────────────────────────────────
  const submitIssue = async () => {
    const line = bomLines[activeIdx]
    const qty  = parseFloat(issueQty)
    if (!foundSource) { setIssueError('Scan a pack or container QR code first'); return }
    if (!qty || qty <= 0) { setIssueError('Enter a valid quantity'); return }
    // Best-effort client-side check only (entered qty is Operational UOM,
    // availableQty is Inventory UOM) — the server re-derives and validates
    // the real conversion before deducting stock.
    if (toInventoryQty(line, qty) > foundSource.availableQty) {
      setIssueError(`Qty exceeds available stock (${foundSource.availableQty} ${foundSource.uom})`); return
    }

    setIssuing(true); setIssueError('')
    try {
      const res = await outwardApi.bomDirect({
        source:      foundSource.type,
        sourceId:    foundSource.id,
        qty,
        rmCode:      line.rmCode,
        productCode: selProduct.productCode,
        productName: selProduct.productName,
        batchSize:   parseFloat(batchQty),
        batchRef,
      })

      // res.issued is the actual Inventory-UOM qty deducted (server-derived,
      // authoritative — required/issued/remaining tracking must use this,
      // not the operator-entered `qty` in Operational UOM, since a partial
      // clamp means less than requested can actually get deducted). But
      // line.required/line.uom are stated in the recipe's own declared unit
      // (line.uom) — issuing Methanol in this codebase issues in L per the
      // recipe while stock is tracked in KG. Accumulating the raw KG number
      // straight into line.issued (compared against an L-based required)
      // silently mixed units. Converting the deducted qty into line.uom
      // here keeps Required/Issued/Remaining in one consistent unit
      // throughout — a no-op when conversionRequired is false (line.uom
      // already matches inventoryUom then, so convertByDensity passes the
      // number straight through).
      const deducted = res.issued
      const rm = rmByCode.get(line.rmCode)
      let deductedInLineUom = deducted
      if (rm) {
        try { deductedInLineUom = convertByDensity(deducted, rm.inventoryUom, line.uom, rm.density).qty }
        catch { deductedInLineUom = deducted }
      }
      const newIssued  = parseFloat((line.issued + deductedInLineUom).toFixed(3))
      const updatedLines = bomLines.map((l, i) =>
        i === activeIdx ? { ...l, issued: newIssued } : l
      )
      setBomLines(updatedLines)
      setLineMsg(prev => ({
        ...prev,
        [activeIdx]: `Issued ${qty} ${entryUomFor(line)}${deducted !== deductedInLineUom ? ` (${deducted} ${rm?.inventoryUom || line.uom} deducted)` : ''} from ${foundSource.type === 'pack' ? 'Pack' : 'Container'}: ${foundSource.id}`,
      }))

      const remaining = parseFloat((line.required - newIssued).toFixed(3))
      if (remaining <= 0.001) {
        setActiveIdx(null)
        if (updatedLines.filter(l => !l.orphaned).every(l => l.issued >= l.required - 0.001)) outwardApi.bomSessions.delete(sessionId).catch(() => {})
      } else {
        // More qty needed — reset scan, keep panel open
        setFoundSource(null); setScanErr(''); setIssueQty(String(remaining.toFixed(3)))
        await loadResources(line.rmCode)
      }
    } catch (e) { setIssueError(e.message) }
    finally { setIssuing(false) }
  }

  // ─── Derived ─────────────────────────────────────────────────────────────
  // Orphaned lines (dropped from the recipe, kept only for audit) don't
  // count toward progress — they're no longer part of what's required.
  const activeLines   = bomLines.filter(l => !l.orphaned)
  const totalRequired = activeLines.length
  const totalDone     = activeLines.filter(l => l.issued >= l.required - 0.001).length
  const progress      = totalRequired > 0 ? Math.round((totalDone / totalRequired) * 100) : 0

  if (step === 'select') {
    return (
      <SelectStep
        error={error}
        isMobile={isMobile}
        selProduct={selProduct}
        batchQty={batchQty}
        batchUom={batchUom}
        batchRef={batchRef}
        diNo={diNo}
        selTaskId={selTaskId}
        taskFilter={taskFilter}
        setTaskFilter={setTaskFilter}
        filteredTasks={filteredTasks}
        loadingTasks={loadingTasks}
        loadingBom={loadingBom}
        onSelectTask={selectTask}
        onLoadBom={loadBom}
        onClearSelection={clearSelection}
      />
    )
  }

  return (
    <BomChecklistStep
      selProduct={selProduct}
      batchQty={batchQty}
      batchUom={batchUom}
      batchRef={batchRef}
      diNo={diNo}
      bomLines={bomLines}
      activeIdx={activeIdx}
      totalDone={totalDone}
      totalRequired={totalRequired}
      progress={progress}
      recipeDrift={recipeDrift}
      onSyncRecipe={syncToCurrentRecipe}
      onBack={() => { setStep('select'); setActiveIdx(null) }}
      onOpenIssuePanel={openIssuePanel}
      onIssueAnother={() => { setStep('select'); setActiveIdx(null); setBomLines([]) }}
      lineMsg={lineMsg}
      rmByCode={rmByCode}
      packs={packs}
      containers={containers}
      loadingRes={loadingRes}
      scanErr={scanErr}
      setScanErr={setScanErr}
      foundSource={foundSource}
      setFoundSource={setFoundSource}
      issueQty={issueQty}
      setIssueQty={setIssueQty}
      issuing={issuing}
      issueError={issueError}
      onScan={handleScan}
      onSubmit={submitIssue}
    />
  )
}
