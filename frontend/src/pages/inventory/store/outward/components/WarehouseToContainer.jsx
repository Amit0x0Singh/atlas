import { useState, useCallback, useEffect } from 'react'
import { containerApi, outwardApi } from '../../../../../api/inventory.js'
import { useQrScanner } from '../../../../../hooks/useQrScanner.js'

export default function WarehouseToContainer({ preselected, onDone }) {
  const [container, setContainer]   = useState(preselected || null)
  const [manualId, setManualId]     = useState('')
  const [loadingCont, setLoadingC]  = useState(false)
  const [availPacks, setAvailPacks] = useState([])
  const [loadingPacks, setLoadingP] = useState(false)
  const [selectedPack, setPack]     = useState(null)
  const [qty, setQty]               = useState('')
  const [submitting, setSub]        = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  useEffect(() => {
    if (preselected) loadPacks(preselected.itemCode)
  }, [])

  const onScan = useCallback(async (raw) => {
    const id = raw.startsWith('CONT:') ? raw.slice(5) : raw
    scanner.stop()
    await loadContainer(id)
  }, [])

  const scanner = useQrScanner(onScan)

  const loadContainer = async (id) => {
    const trimmed = id.trim().toUpperCase()
    if (!trimmed) return
    setError(''); setSuccess(''); setContainer(null); setAvailPacks([]); setPack(null); setQty('')
    try {
      setLoadingC(true)
      const r = await containerApi.get(trimmed)
      setContainer(r.data)
      loadPacks(r.data.itemCode)
    } catch (e) { setError('Container not found: ' + trimmed) }
    finally { setLoadingC(false) }
  }

  const loadPacks = async (itemCode) => {
    try {
      setLoadingP(true)
      const r = await outwardApi.availablePacks(itemCode)
      setAvailPacks(r.data || [])
    } catch { setAvailPacks([]) }
    finally { setLoadingP(false) }
  }

  const submit = async () => {
    const q = parseFloat(qty)
    if (!selectedPack) { setError('Select a pack first'); return }
    if (!q || q <= 0) { setError('Enter a valid quantity'); return }
    setSub(true); setError(''); setSuccess('')
    try {
      const r = await containerApi.fill(container.containerId, { packId: selectedPack.packId, qty: q })
      setSuccess(`Filled ${r.filled} ${container.uom} into ${container.containerId}. Level: ${r.data.currentQty} / ${r.data.capacity} ${r.data.uom}`)
      setContainer(r.data)
      setPack(null); setQty('')
      loadPacks(r.data.itemCode)
    } catch (e) { setError(e.response?.data?.error || e.message) }
    finally { setSub(false) }
  }

  const spaceLeft = container ? container.capacity - container.currentQty : 0

  return (
    <div className="p-6 max-w-2xl">
      <p className="text-sm text-gray-500 mb-5">
        Transfer material from a warehouse pack into a container. Scan the container QR or enter its ID.
      </p>

      {error   && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">{success}</div>}
      {scanner.camError && <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg mb-4 text-sm">{scanner.camError}</div>}

      {/* Always-rendered video (hidden when camera off) */}
      <div className={`bg-black rounded-xl overflow-hidden relative mb-4 ${scanner.active ? 'block' : 'hidden'}`} style={{ height: 240 }}>
        <video ref={scanner.videoRef} className="w-full h-full object-cover" playsInline muted />
        <canvas ref={scanner.canvasRef} className="hidden" />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-40 h-40 border-2 border-orange-400 rounded-lg" />
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
          Point at container QR (orange label)
        </div>
      </div>

      {/* Container selection */}
      {!container && (
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">Container ID</label>
          <div className="flex gap-2">
            <input value={manualId} onChange={e => setManualId(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && loadContainer(manualId)}
              placeholder="e.g. CONT-AZOS"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm font-mono outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button onClick={() => loadContainer(manualId)} disabled={loadingCont || !manualId.trim()}
              className="bg-orange-500 text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
              {loadingCont ? '…' : 'Load'}
            </button>
            <button onClick={scanner.active ? scanner.stop : scanner.start}
              className={`px-4 py-2.5 rounded-lg text-sm font-semibold border transition ${scanner.active ? 'bg-red-50 border-red-300 text-red-600' : 'border-gray-300 hover:bg-gray-50'}`}>
              {scanner.active ? 'Stop' : 'Scan QR'}
            </button>
          </div>
        </div>
      )}

      {/* Container card */}
      {container && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-5">
          <div className="flex justify-between items-start mb-3">
            <div>
              <div className="font-bold text-orange-900 font-mono">{container.containerId}</div>
              <div className="text-sm text-orange-700">{container.itemName} <span className="text-xs font-mono">({container.itemCode})</span></div>
            </div>
            <button onClick={() => { setContainer(null); setAvailPacks([]); setPack(null); setQty('') }}
              className="text-xs text-orange-600 hover:underline">Change</button>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center text-sm">
            {[['Current', container.currentQty, 'text-gray-900'], ['Space Left', spaceLeft.toFixed(2), 'text-blue-700'], ['Capacity', container.capacity, 'text-gray-500']].map(([l, v, c]) => (
              <div key={l} className="bg-white rounded-lg py-2">
                <div className={`font-bold ${c}`}>{v}</div>
                <div className="text-xs text-gray-400">{l} ({container.uom})</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pack selection */}
      {container && (
        <div className="mb-5">
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Source Pack ({container.itemCode})
            {loadingPacks && <span className="text-gray-400 font-normal ml-2 text-xs">Loading…</span>}
          </label>
          {!loadingPacks && availPacks.length === 0
            ? <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg text-sm">No available packs for this RM. Inward stock first.</div>
            : (
              <div className="space-y-2 max-h-52 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                {availPacks.map(p => (
                  <button key={p.packId}
                    onClick={() => { setPack(p); setQty(String(Math.min(p.remainingQty, spaceLeft).toFixed(3))); setError('') }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border text-sm ${selectedPack?.packId === p.packId ? 'bg-orange-50 border-orange-300' : 'border-gray-100 hover:bg-gray-50'}`}>
                    <div className="font-mono text-xs truncate">{p.packId}</div>
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>Lot: {p.lotNo} | Bag #{p.bagNo}</span>
                      <span className="font-semibold text-green-700">{p.remainingQty} {container.uom}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>
      )}

      {/* Qty + submit */}
      {container && selectedPack && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
          <div className="text-xs text-gray-500 mb-3">
            Pack: <span className="font-mono">{selectedPack.packId}</span> |
            Available: <strong>{selectedPack.remainingQty}</strong> |
            Space: <strong>{spaceLeft.toFixed(3)}</strong>
          </div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Qty to Fill *</label>
          <input type="number" min="0.001" step="0.001" max={Math.min(selectedPack.remainingQty, spaceLeft)}
            value={qty} onChange={e => setQty(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-400 mb-3"
          />
          <button onClick={submit} disabled={submitting || !qty}
            className="w-full bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 disabled:opacity-50">
            {submitting ? 'Filling…' : 'Fill Container'}
          </button>
        </div>
      )}
    </div>
  )
}
