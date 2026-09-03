import { useState, useEffect, useCallback } from 'react'
import { Loader2, RotateCcw } from 'lucide-react'
import { Button } from '../../../../../../components/ui'
import ScannerPanel from '../../../../../../components/ScannerPanel/ScannerPanel.jsx'
import { outwardApi, containerApi } from '../../../../../../api/inventory.js'
import { toTitleCase } from '../../../../../../utils/textDisplay.js'

// Inline issue panel for one Material Indent line — mirrors the Material
// Issue by BOM IssuePanel: scan a pack (raw packId) or container
// ("CONT:{id}") QR, enter a qty, submit. The server (materialIndentApi.issue
// → issueLine) is the authority on the UOM conversion and stock deduction.
export default function IndentIssuePanel({ line, onIssue }) {
  const uom = (line.uom || '').toUpperCase()
  const remaining = Math.max(0, +(line.requestedQty - line.issuedQty).toFixed(3))

  const [packs, setPacks]           = useState([])
  const [containers, setContainers] = useState([])
  const [loading, setLoading]       = useState(true)
  const [scanErr, setScanErr]       = useState('')
  const [found, setFound]           = useState(null) // { type, id, availableQty }
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

  const totalAvailable = packs.reduce((s, p) => s + (p.remainingQty || 0), 0)
                       + containers.reduce((s, c) => s + (c.currentQty || 0), 0)

  const handleScan = (raw) => {
    const val = String(raw || '').trim()
    if (!val) return
    setScanErr(''); setFound(null); setErr('')
    if (val.startsWith('CONT:')) {
      const id = val.slice(5)
      const cont = containers.find(c => c.containerId === id)
      if (!cont) { setScanErr(`Container "${id}" has no stock for ${toTitleCase(line.itemName)}.`); return }
      const max = Math.min(remaining, cont.currentQty)
      setFound({ type: 'container', id: cont.containerId, availableQty: cont.currentQty })
      setQty(String(+max.toFixed(3)))
      return
    }
    const pack = packs.find(p => p.packId === val)
    if (!pack) { setScanErr(`"${val}" not found for ${toTitleCase(line.itemName)}. Scan the correct pack or container QR.`); return }
    const max = Math.min(remaining, pack.remainingQty)
    setFound({ type: 'pack', id: pack.packId, availableQty: pack.remainingQty, lotNo: pack.lotNo, supplier: pack.supplier })
    setQty(String(+max.toFixed(3)))
  }

  const submit = async () => {
    const n = parseFloat(qty)
    if (!found) { setErr('Scan a pack or container QR code first.'); return }
    if (!n || n <= 0) { setErr('Enter a valid quantity.'); return }
    if (n > found.availableQty + 0.001) { setErr(`Qty exceeds available stock (${found.availableQty} ${uom}).`); return }
    setBusy(true); setErr('')
    try {
      await onIssue({ itemId: line.id, source: found.type, sourceId: found.id, qty: n })
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || 'Could not issue.')
    } finally {
      setBusy(false)
    }
  }

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
          {(packs.length > 0 || containers.length > 0) && totalAvailable < remaining && (
            <div className="rounded-lg bg-orange-50 border border-orange-200 px-3 py-2.5 text-xs text-orange-800">
              Only <strong>{totalAvailable.toFixed(3)} {uom}</strong> in stock, <strong>{remaining} {uom}</strong> still needed. Issue what's available now.
            </div>
          )}

          {!found && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Scan Pack or Container QR Code</label>
              <ScannerPanel accent="indigo" onScan={handleScan} scanHint="Point camera at pack or container QR" allowManualEntry />
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
                  <div><span className="text-gray-400">Available: </span><span className="font-bold text-green-700">{found.availableQty} {uom}</span></div>
                  {found.lotNo && <div><span className="text-gray-400">Lot: </span><span className="text-gray-800">{found.lotNo}</span></div>}
                  {found.supplier && <div><span className="text-gray-400">Supplier: </span><span className="text-gray-800">{found.supplier}</span></div>}
                </div>
              </div>
              <div className="p-4 flex items-end gap-3 flex-wrap">
                <div>
                  <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Qty to Issue ({uom})</label>
                  <input type="number" min="0" step="any" value={qty} onChange={e => setQty(e.target.value)}
                    className="w-40 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-500" />
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
