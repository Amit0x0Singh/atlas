import { useState, useEffect, useRef, useCallback } from 'react'
import { inwardApi } from '../../../../../api/inventory.js'
import jsQR from 'jsqr'

const STEPS = { SETUP: 'setup', SCANNING: 'scanning', DONE: 'done' }

export default function PackInward() {
  const [step, setStep]               = useState(STEPS.SETUP)
  const [pendingGroups, setPending]   = useState([])
  const [loadingGroups, setLoading]   = useState(true)
  const [selected, setSelected]       = useState(null)
  const [warehouse, setWarehouse]     = useState('Main Store')
  const [session, setSession]         = useState(null)
  const [creating, setCreating]       = useState(false)
  const [error, setError]             = useState('')
  const [scanError, setScanError]     = useState('')
  const [submitting, setSubmitting]   = useState(false)
  const [lastScan, setLastScan]       = useState('')

  const videoRef    = useRef(null)
  const canvasRef   = useRef(null)
  const streamRef   = useRef(null)
  const animRef     = useRef(null)
  const lastScanTime = useRef(0)

  useEffect(() => { loadGroups(); return () => stopCamera() }, [])

  const loadGroups = async () => {
    try {
      setLoading(true)
      const pendingRes = await fetch('/api/packs/pending/inward').then(r => r.json())
      setPending(pendingRes.data || [])
    } catch (e) { setError('Failed to load pending items: ' + e.message) }
    finally { setLoading(false) }
  }

  const startSession = async () => {
    if (!selected || !warehouse) { setError('Select item and warehouse'); return }
    setCreating(true); setError('')
    try {
      const res = await inwardApi.createSession({ itemCode: selected.itemCode, lotNo: selected.lotNo, warehouse })
      setSession(res.data); setStep(STEPS.SCANNING); await startCamera()
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: 640, height: 480 } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => { videoRef.current.play(); scanLoop() }
      }
    } catch (e) { setScanError('Camera error: ' + e.message) }
  }

  const stopCamera = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop())
  }

  const scanLoop = useCallback(() => {
    animRef.current = requestAnimationFrame(async () => {
      const video = videoRef.current; const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) { scanLoop(); return }
      const ctx = canvas.getContext('2d')
      canvas.width = video.videoWidth || 640; canvas.height = video.videoHeight || 480
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)
      const now = Date.now()
      if (code?.data && now - lastScanTime.current > 1500) {
        lastScanTime.current = now
        await handleScan(code.data)
      }
      scanLoop()
    })
  }, [session])

  const handleScan = async (packId) => {
    if (!session) return
    setScanError(''); setLastScan(packId)
    try {
      const res = await inwardApi.scan(session.sessionId, packId)
      setSession(res.data)
    } catch (e) { setScanError(e.message) }
  }

  const removeScan = async (packId) => {
    try { const res = await inwardApi.removeScan(session.sessionId, packId); setSession(res.data) }
    catch (e) { alert(e.message) }
  }

  const submit = async () => {
    if (!confirm('Submit inward for all scanned packs?')) return
    setSubmitting(true)
    try { await inwardApi.submit(session.sessionId, 'Operator'); stopCamera(); setStep(STEPS.DONE) }
    catch (e) { setScanError(e.message) }
    finally { setSubmitting(false) }
  }

  const reset = () => {
    setStep(STEPS.SETUP); setSession(null); setSelected(null); setError(''); setScanError(''); setLastScan(''); loadGroups()
  }

  const scanned = session?.scannedPackIds || []
  const pending = session?.pendingPackIds || []
  const progress = session ? Math.round((scanned.length / session.expectedBags) * 100) : 0
  const allScanned = session && scanned.length >= session.expectedBags

  if (step === STEPS.DONE) return (
    <div className="p-6 max-w-xl">
      <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-green-800 mb-2">Pack Inward Completed!</h2>
        <p className="text-green-700 mb-1">{scanned.length} bags successfully inwarded</p>
        <p className="text-green-600 text-sm mb-6">Item: {selected?.itemName} | Lot: {selected?.lotNo}</p>
        <button onClick={reset} className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 font-semibold">Start New Inward</button>
      </div>
    </div>
  )

  if (step === STEPS.SCANNING) return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{selected?.itemName}</h2>
          <p className="text-sm text-gray-500">Lot: {selected?.lotNo} | Warehouse: {warehouse}</p>
        </div>
        <button onClick={reset} className="text-sm text-gray-500 border border-gray-300 px-3 py-1.5 rounded">Cancel</button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex justify-between text-sm font-medium mb-2">
          <span className="text-green-700">✅ Scanned: {scanned.length}</span>
          <span className="text-orange-600">⏳ Pending: {pending.length}</span>
          <span className="text-gray-700">Total: {session?.expectedBags}</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-green-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-center text-sm text-gray-600 mt-1">{progress}% complete</p>
      </div>

      {scanError && <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4">❌ {scanError}</div>}
      {lastScan && !scanError && <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm">✅ Scanned: {lastScan}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-black rounded-xl overflow-hidden relative" style={{ minHeight: 300 }}>
          <video ref={videoRef} className="w-full" playsInline muted />
          <canvas ref={canvasRef} className="hidden" />
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-48 border-2 border-blue-400 rounded-lg" />
          </div>
          <div className="absolute bottom-3 left-0 right-0 text-center text-white text-sm bg-black/40 py-1">Point camera at pack QR</div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-hidden">
            <h3 className="font-semibold text-green-700 mb-2">✅ Scanned ({scanned.length})</h3>
            <div className="overflow-y-auto max-h-36 space-y-1">
              {scanned.length === 0 ? <p className="text-gray-400 text-sm">No bags scanned yet</p>
                : scanned.map(id => (
                  <div key={id} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded text-sm">
                    <span className="font-mono text-green-800 truncate">{id}</span>
                    <button onClick={() => removeScan(id)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
                  </div>
                ))}
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-hidden">
            <h3 className="font-semibold text-orange-600 mb-2">⏳ Pending ({pending.length})</h3>
            <div className="overflow-y-auto max-h-36 space-y-1">
              {pending.length === 0 ? <p className="text-gray-400 text-sm">All scanned!</p>
                : pending.map(id => <div key={id} className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded truncate">{id}</div>)}
            </div>
          </div>
        </div>
      </div>
      <button onClick={submit} disabled={!allScanned || submitting}
        className={`w-full mt-4 py-4 rounded-xl font-bold text-lg transition-colors ${allScanned ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}>
        {submitting ? 'Submitting...' : allScanned ? '✅ Submit Inward' : `Scan ${pending.length} more bags to unlock submit`}
      </button>
    </div>
  )

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Pack Inward</h2>
      <p className="text-gray-500 text-sm mb-5">Scan individual QR bags into the warehouse. Generate packs first in Print Master.</p>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">{error}</div>}
      {loadingGroups ? <p className="text-gray-400">Loading pending items...</p>
        : pendingGroups.length === 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-4 rounded-lg">
            No packs pending inward. Go to <strong>Print Master</strong> to generate new packs first.
          </div>
        ) : (
          <>
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Select Item & Lot *</label>
              <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
                {pendingGroups.map(g => (
                  <button key={`${g.itemCode}-${g.lotNo}`} onClick={() => setSelected(g)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${selected?.itemCode === g.itemCode && selected?.lotNo === g.lotNo ? 'bg-blue-50 border-blue-400 text-blue-900' : 'border-gray-200 hover:bg-gray-50'}`}>
                    <div className="font-medium">{g.itemName}</div>
                    <div className="text-sm text-gray-500">Code: {g.itemCode} | Lot: {g.lotNo} | <span className="font-semibold text-blue-700">{g.bagCount} bags</span></div>
                  </button>
                ))}
              </div>
            </div>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Warehouse *</label>
              <input value={warehouse} onChange={e => setWarehouse(e.target.value)} placeholder="e.g. Main Store, Cold Store..."
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button onClick={startSession} disabled={!selected || !warehouse || creating}
              className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 font-semibold text-lg disabled:opacity-50">
              {creating ? 'Starting...' : '▶ Start Scanning Session'}
            </button>
          </>
        )}
    </div>
  )
}
