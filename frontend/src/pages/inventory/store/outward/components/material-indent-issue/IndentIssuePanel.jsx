import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '../../../../../../components/ui'
import ScannerPanel from '../../../../../../components/ScannerPanel/ScannerPanel.jsx'
import { outwardApi, containerApi } from '../../../../../../api/inventory.js'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'
import { convertQty, conversionActive } from '../../../../../../utils/uom.js'
import { humanQty, roundQty, pickDisplayUnit } from '../../../../../../utils/qty.js'

// Inline issue panel for one Material Indent line — mirrors Material Issue by
// BOM's IssuePanel: scan a pack / container QR, key a qty in a friendly unit,
// submit. `line` carries the item's RM-Master UOM/Conversion Factor (attached by the
// backend), so pack/container stock (Inventory UOM) is reconciled with what
// the operator types (Operational UOM) exactly the way the store issues.
export default function IndentIssuePanel({ line, onIssue }) {
  const entryUom = (line.operationalUom || line.inventoryUom || line.uom || '').toUpperCase()
  const invUom   = (line.inventoryUom || line.uom || '').toUpperCase()
  // The item shape convertQty() needs — RM-Master UOMs + Conversion Factor,
  // attached to the line by the backend (shared.js attachRmUom).
  const conv = useMemo(() => ({
    inventoryUom:      line.inventoryUom || line.uom,
    operationalUom:    line.operationalUom || line.inventoryUom || line.uom,
    conversionRequired: line.conversionRequired,
    conversionFactor:  line.conversionFactor,
  }), [line.inventoryUom, line.operationalUom, line.conversionRequired, line.conversionFactor, line.uom])
  // Whether a real Inventory⇄Operation conversion applies here — drives the
  // "Conversion Factor" line in the Pack/Container Found card below.
  const converts = conversionActive(conv)
  // requestedQty / issuedQty are both in the line's UOM (== entryUom).
  const remaining = Math.max(0, roundQty(line.requestedQty - line.issuedQty))

  const [packs, setPacks]           = useState([])
  const [containers, setContainers] = useState([])
  const [loading, setLoading]       = useState(true)
  const [scanErr, setScanErr]       = useState('')
  const [found, setFound]           = useState(null) // { type, id, availableInv, displayUom, maxDisplay, ... }
  const [qty, setQty]               = useState('')
  const [busy, setBusy]             = useState(false)
  const [err, setErr]               = useState('')

  const loadStock = useCallback(() => {
    setLoading(true); setScanErr(''); setFound(null); setErr('')
    Promise.allSettled([
      outwardApi.availablePacks(line.itemCode),
      containerApi.list({ itemCode: line.itemCode }),
    ]).then(([p, c]) => {
      setPacks(p.status === 'fulfilled' ? (p.value.data || []) : [])
      setContainers(c.status === 'fulfilled' ? (c.value.data || []).filter(x => x.currentQty > 0) : [])
    }).finally(() => setLoading(false))
  }, [line.itemCode])

  useEffect(() => { loadStock() }, [loadStock])

  // Sum of stock, all in Inventory UOM.
  const totalAvailableInv = packs.reduce((s, p) => s + (p.remainingQty || 0), 0)
                          + containers.reduce((s, c) => s + (c.currentQty || 0), 0)

  // Inventory-UOM qty → Operational (entry) UOM. Best-effort; the server
  // re-derives and validates the real conversion before deducting stock.
  const invToEntry = useCallback((n) => {
    try { return convertQty(n, invUom, entryUom, conv).qty } catch { return n }
  }, [invUom, entryUom, conv])

  const buildFound = (base, availInv) => {
    const maxEntry   = Math.min(remaining, invToEntry(availInv))
    const displayUom = pickDisplayUnit(maxEntry, entryUom)
    let maxDisplay = maxEntry
    try { maxDisplay = convertQty(maxEntry, entryUom, displayUom, conv).qty } catch { /* keep */ }
    setFound({ ...base, availInv, displayUom, maxDisplay: roundQty(maxDisplay) })
    setQty(String(roundQty(maxDisplay)))
  }

  const handleScan = (raw) => {
    const val = String(raw || '').trim()
    if (!val) return
    setScanErr(''); setFound(null); setErr('')
    if (val.startsWith('CONT:')) {
      const id = val.slice(5)
      const cont = containers.find(c => c.containerId === id)
      if (!cont) { setScanErr(`Container "${id}" has no stock for ${toTitleCase(line.itemName)}.`); return }
      buildFound({ type: 'container', id: cont.containerId }, cont.currentQty)
      return
    }
    const pack = packs.find(p => p.packId === val)
    if (!pack) { setScanErr(`"${val}" not found for ${toTitleCase(line.itemName)}. Scan the correct pack or container QR.`); return }
    buildFound({ type: 'pack', id: pack.packId, lotNo: pack.lotNo, supplier: pack.supplier }, pack.remainingQty)
  }

  const submit = async () => {
    const displayQty = parseFloat(qty)
    if (!found) { setErr('Scan a pack or container QR code first.'); return }
    if (!displayQty || displayQty <= 0) { setErr('Enter a valid quantity.'); return }

    // Convert what the operator typed (friendly unit) → Operational UOM,
    // which is what the server's resolveIssueQty expects.
    let entryQty = displayQty
    try { entryQty = roundQty(convertQty(displayQty, found.displayUom, entryUom, conv).qty) } catch { entryQty = displayQty }

    // Best-effort ceiling check — entryQty vs the source's stock, both in
    // Inventory UOM. The server re-validates before deducting.
    let entryInInv = entryQty
    try { entryInInv = convertQty(entryQty, entryUom, invUom, conv).qty } catch { /* same unit */ }
    if (entryInInv > found.availInv + 1e-9) {
      setErr(`Qty exceeds available stock (${humanQty(found.availInv, invUom)}).`); return
    }

    setBusy(true); setErr('')
    try {
      await onIssue({ itemId: line.id, source: found.type, sourceId: found.id, qty: entryQty, displayQty, displayUom: found.displayUom })
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Could not issue.')
    } finally {
      setBusy(false)
    }
  }

  const shortStock = (packs.length > 0 || containers.length > 0) && invToEntry(totalAvailableInv) < remaining - 1e-9

  return (
    <div className="border-t border-indigo-200 bg-white p-4">
      {loading ? (
        <p className="text-sm text-gray-400 text-center py-4"><Loader2 className="animate-spin inline mr-2" size={16} />Checking available stock…</p>
      ) : (
        <div className="space-y-3">
          {packs.length === 0 && containers.length === 0 && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-800">
              No warehouse packs or containers have stock for {toTitleCase(line.itemName)}.
            </div>
          )}
          {shortStock && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5 text-xs text-orange-800">
              Only <strong>{humanQty(totalAvailableInv, invUom)}</strong> in stock, <strong>{humanQty(remaining, entryUom)}</strong> still needed. Issue what's available now.
            </div>
          )}

          {!found && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Scan Pack or Container QR Code</label>
              {/* Issuing must always come from an actual scan — no manual ID
                  entry — so a store person can't key in the wrong pack/
                  container by hand. */}
              <ScannerPanel accent="indigo" onScan={handleScan} scanHint="Point camera at pack or container QR" allowManualEntry={false} />
              <p className="text-xs text-gray-400 mt-1.5">Container QR must start with <span className="font-mono">CONT:</span></p>
            </div>
          )}

          {scanErr && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2.5 text-xs text-red-700">{scanErr}</div>}

          {found && (
            <div className="rounded-xl border border-indigo-200 overflow-hidden">
              <div className="bg-indigo-50 px-4 py-3 text-xs text-gray-600">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-sm text-indigo-800">{found.type === 'pack' ? '📦 Pack Found' : '🏺 Container Found'}</span>
                  <button type="button" onClick={() => { setFound(null); setScanErr(''); setQty('') }}
                    className="text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                    <RotateCcw size={12} /> Rescan
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <div><span className="text-gray-400">ID: </span><span className="font-mono font-semibold text-gray-900">{found.id}</span></div>
                  <div><span className="text-gray-400">Available: </span><span className="font-bold text-green-700">{humanQty(found.availInv, invUom)}</span></div>
                  {found.lotNo && <div><span className="text-gray-400">Lot: </span><span className="text-gray-800">{found.lotNo}</span></div>}
                  {found.supplier && <div><span className="text-gray-400">Supplier: </span><span className="text-gray-800">{toTitleCase(found.supplier)}</span></div>}
                  {converts && (
                    <div>
                      <span className="text-gray-400">Conversion Factor: </span>
                      <span className="font-semibold text-gray-800">{line.conversionFactor} {invUom}/{entryUom}</span>
                    </div>
                  )}
                  <div><span className="text-gray-400">Still needed: </span><span className="font-bold text-red-600">{humanQty(remaining, entryUom)}</span></div>
                </div>
              </div>
              <div className="p-4 flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Qty to Issue ({found.displayUom})</label>
                  <input type="number" min="0" step="any" max={found.maxDisplay} value={qty} onChange={e => setQty(e.target.value)}
                    className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
                  <p className="text-xs text-gray-400 mt-1">
                    Max: {roundQty(found.maxDisplay)} {found.displayUom}
                    {entryUom !== invUom && <> (stock tracked in {invUom})</>}
                  </p>
                </div>
                <Button variant="purple" onClick={submit} loading={busy}>Issue</Button>
              </div>
              {err && <div className="px-4 pb-4 -mt-1 text-xs text-red-600">{err}</div>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
