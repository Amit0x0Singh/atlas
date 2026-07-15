import { useState, useEffect, useRef } from 'react'
import { inwardApi, packsApi } from '../../../../../../api/inventory.js'
import { Button, IconButton, BottomSheet, Modal } from '../../../../../../components/ui'
import { useIsMobile } from '../../../../../../hooks/useIsMobile.js'
import { X, Pause, CheckCircle2, Clock, Search, Undo2, PartyPopper, PackageCheck, Info, Flashlight, FlashlightOff, Smartphone, ScanBarcode } from 'lucide-react'
import ScanSummaryCard from './components/scan-summary-card/ScanSummaryCard.jsx'
import StickySubmitBar from './components/sticky-submit-bar/StickySubmitBar.jsx'
import ManualEntryDrawer from './components/manual-entry-drawer/ManualEntryDrawer.jsx'
import './PackInward.css'

const STEPS = { SETUP: 'setup', SCANNING: 'scanning', DONE: 'done' }

// Scans are validated locally against the packs snapshot fetched once at
// session start (no per-scan network call) and synced to the backend in
// batches instead — debounced during active scanning, or immediately once
// enough scans queue up, so a fast scanning run still stays responsive
// without a request piling up behind every single bag.
const FLUSH_DEBOUNCE_MS = 800
const BATCH_THRESHOLD   = 20
const FLUSH_RETRY_MS    = 3000
const localScanKey = (sessionId) => `inward-scan:${sessionId}`

// Haptic feedback so an operator scanning bag-after-bag doesn't need to
// glance at the screen to know a scan landed — a short single buzz for a
// good scan, a distinct double-buzz for anything rejected (unknown QR,
// duplicate, wrong status). Vibration API is Android-Chrome-only (no iOS
// Safari support) — feature-detected so it's silently a no-op elsewhere.
const vibrateScanOk    = () => navigator.vibrate?.(60)
const vibrateScanError = () => navigator.vibrate?.([80, 60, 80])

const WAREHOUSES = [
  'BULK ROOM',
  'BOX GODOWN',
  'BOTTLE GODOWN',
  'STERILE ROOM I',
  'STERILE ROOM II',
  'COLD ROOM',
  'SOLVENT GODOWN',
  'ACM ROOM',
  'HERBAL STORAGE',
]

export default function PackInward() {
  const [step, setStep]             = useState(STEPS.SETUP)
  const [pendingGroups, setPending] = useState([])
  const [loadingGroups, setLoading] = useState(true)
  const [activeSessionMap, setActiveSessionMap] = useState({})
  const [selected, setSelected]     = useState(null)
  const [warehouse, setWarehouse]   = useState(WAREHOUSES[0])
  const [session, setSession]       = useState(null)
  const [resumed, setResumed]       = useState(false)
  const [creating, setCreating]     = useState(false)
  const [error, setError]           = useState('')
  const [scanError, setScanError]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastScan, setLastScan]     = useState('')
  const [manualId, setManualId]     = useState('')
  const [warehouseFlash, setWarehouseFlash] = useState('')
  const [doneStats, setDoneStats]           = useState({ submitted: 0, leftOver: 0 })
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn]               = useState(false)
  // 'camera' = phone/laptop camera via BarcodeDetector; 'hardware' = a Zebra
  // TC21-style handheld with a built-in scan engine, which (via its
  // DataWedge keyboard-wedge profile — the factory default) needs no camera
  // or SDK integration at all: it just types the decoded value into
  // whichever input has focus, followed by Enter. So "hardware mode" is
  // really just an always-focused text input wired to the same doScan path.
  const [scanMode, setScanMode] = useState('camera')

  // Mobile-only UI state (bottom sheets for the compact scan summary cards)
  const isMobile = useIsMobile()
  const [sheet, setSheet]                 = useState(null) // null | 'scanned' | 'pending'
  const [scannedSearch, setScannedSearch] = useState('')
  const [pendingSearch, setPendingSearch] = useState('')
  const [showResumedInfo, setShowResumedInfo] = useState(false)

  const videoRef      = useRef(null)
  const canvasRef     = useRef(null)
  const streamRef     = useRef(null)
  const videoTrackRef = useRef(null)
  const animRef       = useRef(null)
  const sessionRef    = useRef(null)
  const scanningRef   = useRef(false)
  const lastScanTime  = useRef(0)
  const warehouseRef  = useRef(warehouse)
  // Native decoder when the browser has one (reads the <video> element
  // directly — no per-frame canvas draw / getImageData needed); jsQR is only
  // loaded on demand as a fallback for browsers without BarcodeDetector
  // (e.g. Firefox), so its decode cost never ships to the common case.
  const detectorRef        = useRef(null)
  const jsQRRef            = useRef(null)
  const lastFallbackDecode = useRef(0)
  const hardwareInputRef   = useRef(null)

  // Local-first scanning state — built once at session start, read/written
  // synchronously on every scan with zero network calls.
  const packMapRef      = useRef(new Map())  // packId -> { packId, bagNo, packQty, uom, status }
  const scannedSetRef   = useRef(new Set())  // packIds scanned so far (synced or still queued)
  const pendingQueueRef = useRef([])         // packIds scanned locally but not yet synced
  const flushTimerRef   = useRef(null)
  const isFlushingRef   = useRef(false)      // true while a batch-scan request is in flight
  const flushAgainRef   = useRef(false)      // more scans queued while the in-flight one was running

  useEffect(() => {
    loadGroups()
    return () => { stopCamera(); if (flushTimerRef.current) clearTimeout(flushTimerRef.current) }
  }, [])
  useEffect(() => { sessionRef.current = session }, [session])
  useEffect(() => { warehouseRef.current = warehouse }, [warehouse])

  // Flush whatever's queued right before the tab is backgrounded/locked —
  // the moment right before connectivity is most likely to drop.
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'hidden' && pendingQueueRef.current.length > 0) flushPendingScans()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])

  // Mobile and desktop render separate <video> elements (different layouts around
  // the camera), so crossing the breakpoint mid-session remounts it — reattach the
  // already-live stream instead of restarting the camera.
  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [isMobile])

  // Hardware-scanner mode has no camera — the scan buffer input just needs
  // to stay focused so the device's keyboard-wedge output lands in it.
  useEffect(() => {
    if (step === STEPS.SCANNING && scanMode === 'hardware') {
      hardwareInputRef.current?.focus()
    }
  }, [step, scanMode, isMobile])

  const refocusHardwareInput = () => {
    if (scanMode !== 'hardware' || showResumedInfo) return
    setTimeout(() => hardwareInputRef.current?.focus(), 100)
  }

  const loadGroups = async () => {
    try {
      setLoading(true)
      const [pendingRes, sessionsRes] = await Promise.all([
        packsApi.pendingInward(),
        inwardApi.activeSessions(),
      ])
      setPending(pendingRes.data || [])
      const map = {}
      for (const s of (sessionsRes.data || [])) {
        map[`${s.itemCode}-${s.lotNo}`] = s
      }
      setActiveSessionMap(map)
    } catch (e) { setError('Failed to load: ' + e.message) }
    finally { setLoading(false) }
  }

  const startSession = async (mode) => {
    if (!selected || !warehouse) { setError('Select item and warehouse'); return }
    setScanMode(mode)
    setCreating(true); setError('')
    try {
      const sessionKey  = `${selected.itemCode}-${selected.lotNo}`
      const isResume    = !!activeSessionMap[sessionKey]
      // One round trip: createSession now returns the full pack list for
      // this item/lot too, so there's no separate getSession() follow-up
      // just to fetch the same session a second time.
      const createRes   = await inwardApi.createSession({ itemCode: selected.itemCode, lotNo: selected.lotNo, warehouse })
      const sessionData = createRes.data
      const alreadyScanned = (sessionData?.scannedPackIds?.length || 0) > 0

      packMapRef.current = new Map((sessionData.packs || []).map(p => [p.packId, p]))
      scannedSetRef.current = new Set(sessionData.scannedPackIds || [])
      pendingQueueRef.current = []

      // Recover any scans that were queued locally but never made it to the
      // server — e.g. the tab crashed or lost network mid-session.
      let restored = sessionData
      try {
        const raw = localStorage.getItem(localScanKey(sessionData.sessionId))
        if (raw) {
          const saved = JSON.parse(raw)
          const toReplay = (saved.queue || []).filter(
            id => packMapRef.current.has(id) && !scannedSetRef.current.has(id)
          )
          if (toReplay.length > 0) {
            for (const id of toReplay) { scannedSetRef.current.add(id); pendingQueueRef.current.push(id) }
            restored = {
              ...sessionData,
              scannedPackIds: [...sessionData.scannedPackIds, ...toReplay],
              pendingPackIds: sessionData.pendingPackIds.filter(id => !toReplay.includes(id)),
            }
          }
        }
      } catch { /* corrupt/stale localStorage entry — ignore */ }

      sessionRef.current = restored
      setSession(restored)
      setResumed(isResume || alreadyScanned)
      setStep(STEPS.SCANNING)
      // Hardware scanners (Zebra TC21 etc.) have their own scan engine and
      // need no camera — starting one would just prompt for a permission
      // the device doesn't need and never gets used.
      if (mode === 'camera') await startCamera()
      if (pendingQueueRef.current.length > 0) scheduleFlush()
    } catch (e) { setError(e.message) }
    finally { setCreating(false) }
  }

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          // Lower resolution = far fewer pixels to decode per frame — the
          // single biggest lever for scan speed on weaker mobile CPUs, and
          // still plenty of detail for a QR code held at normal scanning
          // distance. Requesting 1280x720 was the main reason phones felt
          // much slower than laptops here.
          width:  { ideal: 640 },
          height: { ideal: 480 },
        },
      })
      streamRef.current = stream

      if (!detectorRef.current && 'BarcodeDetector' in window) {
        detectorRef.current = new window.BarcodeDetector({ formats: ['qr_code'] })
      }

      const track = stream.getVideoTracks()[0]
      videoTrackRef.current = track
      // Focus/torch constraints are only reliably honoured once the track
      // is actually live — requesting them inside getUserMedia itself is
      // silently ignored on a lot of Android/Chrome camera hardware.
      const caps = track.getCapabilities?.() || {}
      if (caps.focusMode?.includes('continuous')) {
        track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {})
      }
      setTorchSupported(!!caps.torch)

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play()
          scanningRef.current = true
          runScanLoop()
        }
      }
    } catch (e) {
      setScanError('Camera unavailable: ' + e.message + '. Use manual entry below.')
    }
  }

  const stopCamera = () => {
    scanningRef.current = false
    if (animRef.current) cancelAnimationFrame(animRef.current)
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null }
    videoTrackRef.current = null
    setTorchSupported(false)
    setTorchOn(false)
  }

  const toggleTorch = async () => {
    const track = videoTrackRef.current
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch { /* capability flag lied — device doesn't actually support it */ }
  }

  // jsQR is only pulled into the bundle for browsers without a native
  // BarcodeDetector (e.g. Firefox) — dynamic import keeps its parse/decode
  // cost off the common path entirely.
  const decodeWithJsQR = async (video, canvas) => {
    if (!jsQRRef.current) jsQRRef.current = (await import('jsqr')).default
    const ctx = canvas.getContext('2d')
    canvas.width  = video.videoWidth  || 640
    canvas.height = video.videoHeight || 480
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    return jsQRRef.current(imageData.data, imageData.width, imageData.height)?.data || null
  }

  const runScanLoop = () => {
    if (!scanningRef.current) return
    animRef.current = requestAnimationFrame(async () => {
      const video  = videoRef.current
      const canvas = canvasRef.current
      if (!video || !canvas || video.readyState < 2) {
        if (scanningRef.current) runScanLoop()
        return
      }

      let data = null
      try {
        if (detectorRef.current) {
          // Native decoder reads the <video> frame directly — no manual
          // canvas draw / getImageData round-trip, which is where most of
          // the per-frame cost of the JS fallback path goes.
          const codes = await detectorRef.current.detect(video)
          data = codes[0]?.rawValue || null
        } else {
          const now = performance.now()
          // The JS fallback decode is comparatively expensive — throttle it
          // instead of attempting on every animation frame (~60/s).
          if (now - lastFallbackDecode.current > 150) {
            lastFallbackDecode.current = now
            data = await decodeWithJsQR(video, canvas)
          }
        }
      } catch { /* transient decode error on this frame — just retry next one */ }

      const now = Date.now()
      if (data && now - lastScanTime.current > 1500) {
        lastScanTime.current = now
        await doScan(data)
      }
      if (scanningRef.current) runScanLoop()
    })
  }

  // Persists the not-yet-synced queue so a crash/reload can recover it —
  // removed entirely once the queue drains so nothing lingers in storage.
  const persistLocalQueue = (sessionId) => {
    if (!sessionId) return
    if (pendingQueueRef.current.length === 0) localStorage.removeItem(localScanKey(sessionId))
    else localStorage.setItem(localScanKey(sessionId), JSON.stringify({ queue: pendingQueueRef.current }))
  }

  const scheduleFlush = () => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
    if (pendingQueueRef.current.length >= BATCH_THRESHOLD) { flushPendingScans(); return }
    flushTimerRef.current = setTimeout(flushPendingScans, FLUSH_DEBOUNCE_MS)
  }

  const flushPendingScans = async () => {
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); flushTimerRef.current = null }

    // A batch is already in flight — don't fire an overlapping request for
    // whatever's queued now; the in-flight one's `finally` block will
    // re-trigger a flush for anything still queued once it settles.
    if (isFlushingRef.current) { flushAgainRef.current = true; return }

    const cur = sessionRef.current
    if (!cur || pendingQueueRef.current.length === 0) return

    isFlushingRef.current = true
    let failed = false
    const toSync = [...pendingQueueRef.current]
    try {
      const res = await inwardApi.batchScan(cur.sessionId, toSync, warehouseRef.current)
      // Drop only what we actually sent — anything queued after this
      // request started (scanned while it was in flight) stays queued.
      pendingQueueRef.current = pendingQueueRef.current.filter(id => !toSync.includes(id))

      const server = res.data
      const stillQueued = pendingQueueRef.current
      const merged = {
        ...server,
        scannedPackIds: [...new Set([...server.scannedPackIds, ...stillQueued])],
        pendingPackIds: server.pendingPackIds.filter(id => !stillQueued.includes(id)),
      }
      scannedSetRef.current = new Set(merged.scannedPackIds)
      sessionRef.current = merged
      setSession(merged)
      persistLocalQueue(cur.sessionId)

      // Only surface true failures — ALREADY_SCANNED just means another
      // device synced that pack first, which is expected and harmless.
      const hardRejections = (res.rejected || []).filter(r => r.reason !== 'ALREADY_SCANNED')
      if (hardRejections.length > 0) {
        setScanError(`${hardRejections.length} scan(s) couldn't be saved: ${hardRejections.map(r => r.packId).join(', ')}`)
      }
    } catch (e) {
      // Leave the queue (and its localStorage backup) intact — nothing
      // scanned locally is lost, it's just delayed until the retry below.
      failed = true
      setScanError('Sync pending — will retry (' + e.message + ')')
    } finally {
      isFlushingRef.current = false
      const moreQueued = flushAgainRef.current || pendingQueueRef.current.length > 0
      flushAgainRef.current = false
      if (failed) {
        // Real failure (network/server error) — back off before retrying.
        flushTimerRef.current = setTimeout(flushPendingScans, FLUSH_RETRY_MS)
      } else if (moreQueued) {
        // Succeeded, but more was scanned while this request was in flight —
        // pick it up through the normal debounce/threshold path, not a slow retry.
        scheduleFlush()
      }
    }
  }

  const doScan = (packId) => {
    const cur = sessionRef.current
    if (!cur) return
    setScanError(''); setLastScan(packId)

    const pack = packMapRef.current.get(packId)
    if (!pack) { vibrateScanError(); setScanError(`Unknown pack: ${packId}`); return }
    if (scannedSetRef.current.has(packId)) { vibrateScanError(); setScanError(`Already scanned: ${packId}`); return }
    if (pack.status !== 'AWAITING_INWARD') { vibrateScanError(); setScanError(`Pack ${packId} is already ${pack.status}`); return }

    vibrateScanOk()
    const wh = warehouseRef.current
    scannedSetRef.current.add(packId)
    pendingQueueRef.current.push(packId)

    const next = {
      ...cur,
      scannedPackIds: [...cur.scannedPackIds, packId],
      pendingPackIds: cur.pendingPackIds.filter(id => id !== packId),
      packWarehouses: { ...(cur.packWarehouses || {}), [packId]: wh },
    }
    sessionRef.current = next
    setSession(next)

    persistLocalQueue(cur.sessionId)
    scheduleFlush()
  }

  const submitManual = (e) => {
    e.preventDefault()
    const id = manualId.trim()
    if (!id) return
    setManualId('')
    doScan(id)
  }

  const removeScan = async (packId) => {
    const cur = sessionRef.current
    if (!cur) return

    // Still only queued locally (not yet synced) — just drop it, no network call needed.
    const queuedIdx = pendingQueueRef.current.indexOf(packId)
    if (queuedIdx !== -1) {
      pendingQueueRef.current.splice(queuedIdx, 1)
      scannedSetRef.current.delete(packId)
      const next = {
        ...cur,
        scannedPackIds: cur.scannedPackIds.filter(id => id !== packId),
        pendingPackIds: [...cur.pendingPackIds, packId],
      }
      sessionRef.current = next
      setSession(next)
      persistLocalQueue(cur.sessionId)
      return
    }

    // Already synced — remove it server-side (Undo is rare, an immediate call is fine).
    try {
      const res = await inwardApi.removeScan(cur.sessionId, packId)
      scannedSetRef.current.delete(packId)
      sessionRef.current = res.data
      setSession(res.data)
    } catch (e) { alert(e.message) }
  }

  const undoLastScan = async () => {
    if (scanned.length === 0) return
    await removeScan(scanned[scanned.length - 1])
  }

  const submit = async () => {
    const cur = sessionRef.current
    if (!cur) return
    setSubmitting(true)
    try {
      // Make sure everything scanned locally is durably persisted before
      // committing the inward — submit only ever acts on what's in the DB.
      await flushPendingScans()
      setDoneStats({ submitted: scanned.length, leftOver: pending.length })
      await inwardApi.submit(cur.sessionId, 'Operator')
      localStorage.removeItem(localScanKey(cur.sessionId))
      stopCamera()
      setStep(STEPS.DONE)
    } catch (e) { setScanError(e.message) }
    finally { setSubmitting(false) }
  }

  const pauseAndExit = async () => {
    await flushPendingScans()
    stopCamera()
    sessionRef.current = null
    setStep(STEPS.SETUP); setSession(null); setSelected(null)
    setError(''); setScanError(''); setLastScan(''); setManualId('')
    setWarehouse(WAREHOUSES[0]); setResumed(false)
    loadGroups()
  }

  const handleWarehouseChange = (newWh) => {
    setWarehouse(newWh)
    warehouseRef.current = newWh
    setWarehouseFlash(newWh)
    setTimeout(() => setWarehouseFlash(''), 2500)
  }

  const scanned    = session?.scannedPackIds || []
  const pending    = session?.pendingPackIds || []
  const progress   = session ? Math.round((scanned.length / session.expectedBags) * 100) : 0
  const allScanned = session && scanned.length >= session.expectedBags
  const canSubmit  = scanned.length > 0

  // ─── Done ────────────────────────────────────────────────────────────────
  if (step === STEPS.DONE) return (
    <div className="p-4 md:p-6 max-w-xl">
      {doneStats.leftOver > 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <PackageCheck size={48} className="mx-auto mb-4 text-blue-600" />
          <h2 className="text-2xl font-bold text-blue-800 mb-2">Partial Inward Submitted</h2>
          <p className="text-blue-700 mb-1">
            <span className="font-bold">{doneStats.submitted} bag{doneStats.submitted !== 1 ? 's' : ''}</span> successfully inwarded
          </p>
          <p className="text-blue-600 text-sm mb-3">Item: {selected?.itemName} | Lot: {selected?.lotNo}</p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mb-6 text-sm text-amber-800">
            ⏳ <span className="font-semibold">{doneStats.leftOver} bag{doneStats.leftOver !== 1 ? 's' : ''} still pending</span> — come back tomorrow and start a new session to scan the rest.
          </div>
          <Button onClick={pauseAndExit} variant="primary">Back to Setup</Button>
        </div>
      ) : (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <PartyPopper size={48} className="mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold text-green-800 mb-2">Pack Inward Completed!</h2>
          <p className="text-green-700 mb-1">{doneStats.submitted} bags successfully inwarded</p>
          <p className="text-green-600 text-sm mb-6">Item: {selected?.itemName} | Lot: {selected?.lotNo}</p>
          <Button onClick={pauseAndExit} variant="success">Start New Inward</Button>
        </div>
      )}
    </div>
  )

  // ─── Scanning ────────────────────────────────────────────────────────────
  if (step === STEPS.SCANNING) return (
    <div className="p-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-gray-900 truncate">{selected?.itemName}</h2>
          <p className="text-sm text-gray-500">Lot: {selected?.lotNo}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {resumed && (
            <Button onClick={() => setShowResumedInfo(true)} variant="outline-gray" size="sm" icon={Info}>
              Session Resumed
            </Button>
          )}
          <Button onClick={pauseAndExit} variant="warning" size="sm" icon={Pause}>
            Pause 
          </Button>
        </div>
      </div>

      {/* Session resumed info popup */}
      <Modal open={showResumedInfo} onClose={() => setShowResumedInfo(false)} size="sm">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Pause size={18} className="text-amber-600 shrink-0" />
            <h3 className="text-base font-bold text-gray-900">Session Resumed</h3>
          </div>
          <p className="text-sm text-gray-600 mb-1">
            <span className="font-semibold text-gray-900">{scanned.length} bag{scanned.length !== 1 ? 's' : ''}</span> already scanned.
          </p>
          <p className="text-sm text-amber-600 mb-5">
            Scan {pending.length} remaining bag{pending.length !== 1 ? 's' : ''} to complete.
          </p>
          <Button onClick={() => setShowResumedInfo(false)} variant="primary" fullWidth size="sm">Got it</Button>
        </div>
      </Modal>

      {isMobile ? (
        /* ─── Mobile: scan-first layout — camera first, compact summaries, sticky submit ─── */
        <>
          <div className="pb-24">
            {/* Warehouse selector — above the camera, not inside it */}
            <select
              value={warehouse}
              onChange={e => handleWarehouseChange(e.target.value)}
              className="w-full border-2 border-indigo-400 bg-indigo-50 text-indigo-800 font-bold rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer mb-2.5"
            >
              {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            {warehouseFlash && (
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg mb-2.5 text-sm font-semibold text-center animate-pulse">
                Warehouse changed → {warehouseFlash}
              </div>
            )}

            {/* Camera — the primary focus, right after the header */}
            {scanMode === 'camera' ? (
              <div className="bg-black rounded-2xl overflow-hidden relative pi-camera-container mb-2.5">
                <video ref={videoRef} className="w-full" playsInline muted />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="w-40 h-40 border-2 border-blue-400 rounded-lg" />
                </div>
                {torchSupported && (
                  <button
                    onClick={toggleTorch}
                    className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${torchOn ? 'bg-amber-400 text-black' : 'bg-black/50 text-white'}`}
                    title={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                  >
                    {torchOn ? <Flashlight size={16} /> : <FlashlightOff size={16} />}
                  </button>
                )}
                <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/40 py-1">
                  Point camera at pack QR
                </div>
              </div>
            ) : (
              <div
                onClick={refocusHardwareInput}
                className="bg-slate-900 rounded-2xl overflow-hidden relative mb-2.5 px-5 py-8 flex flex-col items-center gap-3 text-center"
              >
                <ScanBarcode size={36} className="text-blue-400" />
                <p className="text-white font-semibold text-sm">Ready to Scan</p>
                <p className="text-slate-400 text-xs">Press the trigger on your scanner</p>
                <form onSubmit={submitManual} className="w-full mt-1">
                  <input
                    ref={hardwareInputRef}
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                    onBlur={refocusHardwareInput}
                    autoFocus
                    className="w-full text-center bg-slate-800 text-white border border-slate-600 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Waiting for scan…"
                  />
                </form>
              </div>
            )}

            {scanError && (
              <div className="bg-red-50 border border-red-300 text-red-700 px-3 py-2 rounded-lg mb-2.5 text-xs">{scanError}</div>
            )}
            {lastScan && !scanError && !warehouseFlash && (
              <div className="bg-green-50 border border-green-300 text-green-700 px-3 py-2 rounded-lg mb-2.5 text-xs">
                Scanned: {lastScan}
              </div>
            )}

            {/* Compact progress */}
            <div className="bg-white rounded-xl border border-gray-200 px-3.5 py-3 mb-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm font-bold text-gray-800">{scanned.length} / {session?.expectedBags} Bags</span>
                <span className="text-xs font-semibold text-orange-600">Remaining: {pending.length}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Scan summary — tap to inspect the full list in a bottom sheet */}
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <ScanSummaryCard icon={CheckCircle2} label="Scanned" count={scanned.length} tone="success" onClick={() => setSheet('scanned')} />
              <ScanSummaryCard icon={Clock} label="Pending" count={pending.length} tone="warning" onClick={() => setSheet('pending')} />
            </div>

            {/* Manual entry — collapsed, rarely used (hardware mode already
                has its own always-visible input above, so skip the duplicate) */}
            {scanMode === 'camera' && (
              <ManualEntryDrawer value={manualId} onChange={setManualId} onSubmit={submitManual} />
            )}
          </div>

          <StickySubmitBar
            scannedCount={scanned.length}
            pendingCount={pending.length}
            allScanned={allScanned}
            canSubmit={canSubmit}
            disabled={!canSubmit || submitting}
            loading={submitting}
            onSubmit={submit}
          />

          <BottomSheet open={sheet === 'scanned'} onClose={() => setSheet(null)} title={`Scanned Bags (${scanned.length})`}>
            <div className="p-4">
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={scannedSearch}
                  onChange={e => setScannedSearch(e.target.value)}
                  placeholder="Search scanned bags…"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              {scanned.length > 0 && (
                <button
                  onClick={undoLastScan}
                  className="w-full flex items-center justify-center gap-1.5 mb-3 px-3 py-2.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-sm font-semibold active:bg-red-100 transition-colors"
                >
                  <Undo2 size={14} /> Undo Last Scan
                </button>
              )}
              <div className="space-y-1.5">
                {scanned.filter(id => id.toLowerCase().includes(scannedSearch.toLowerCase())).map(id => (
                  <div key={id} className="flex items-center justify-between bg-green-50 border border-green-100 px-3 py-2.5 rounded-lg">
                    <span className="font-mono text-sm text-green-800 truncate">{id}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <CheckCircle2 size={16} className="text-green-600" />
                      <IconButton icon={X} onClick={() => removeScan(id)} variant="danger" size="xs" tooltip="Remove" />
                    </div>
                  </div>
                ))}
                {scanned.length === 0 && <p className="text-gray-400 text-sm text-center py-8">No bags scanned yet</p>}
              </div>
            </div>
          </BottomSheet>

          <BottomSheet open={sheet === 'pending'} onClose={() => setSheet(null)} title={`Pending Bags (${pending.length})`}>
            <div className="p-4">
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={pendingSearch}
                  onChange={e => setPendingSearch(e.target.value)}
                  placeholder="Search pending bags…"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div className="space-y-1.5">
                {pending.filter(id => id.toLowerCase().includes(pendingSearch.toLowerCase())).map(id => (
                  <div key={id} className="font-mono text-sm text-gray-600 bg-gray-50 border border-gray-100 px-3 py-2.5 rounded-lg truncate">{id}</div>
                ))}
                {pending.length === 0 && <p className="text-gray-400 text-sm text-center py-8">All scanned!</p>}
              </div>
            </div>
          </BottomSheet>
        </>
      ) : (
        /* ─── Desktop: unchanged ─── */
        <>
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-4 py-3 mb-4 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 md:flex-1 min-w-0">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-indigo-600 leading-none mb-1">Scanning bags to warehouse</p>
                <p className="text-[11px] text-indigo-400">Change anytime — next scan goes to the selected warehouse</p>
              </div>
            </div>
            <select
              value={warehouse}
              onChange={e => handleWarehouseChange(e.target.value)}
              className="w-full md:w-auto border-2 border-indigo-400 bg-white text-indigo-800 font-bold rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>

          {warehouseFlash && (
            <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg mb-3 text-sm font-semibold text-center animate-pulse">
              Warehouse changed → {warehouseFlash}
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <div className="flex justify-between text-sm font-medium mb-2">
              <span className="text-green-700">Scanned: {scanned.length}</span>
              <span className="text-orange-600">Pending: {pending.length}</span>
              <span className="text-gray-700">Total: {session?.expectedBags}</span>
            </div>
            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 transition-all duration-300 rounded-full" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-center text-sm text-gray-600 mt-1">{progress}% complete</p>
          </div>

          {scanError && (
            <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {scanError}
            </div>
          )}
          {lastScan && !scanError && !warehouseFlash && (
            <div className="bg-green-50 border border-green-300 text-green-700 px-4 py-2 rounded-lg mb-4 text-sm">
              Scanned: {lastScan}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Camera / hardware scanner */}
            <div className="flex flex-col gap-3">
              {scanMode === 'camera' ? (
                <div className="bg-black rounded-xl overflow-hidden relative pi-camera-container">
                  <video ref={videoRef} className="w-full" playsInline muted />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-blue-400 rounded-lg" />
                  </div>
                  <div className="absolute top-2 left-2 right-12 bg-indigo-700/80 rounded-lg px-3 py-1.5 text-center">
                    <span className="text-white text-xs font-semibold">{warehouse}</span>
                  </div>
                  {torchSupported && (
                    <button
                      onClick={toggleTorch}
                      className={`absolute top-2 right-2 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${torchOn ? 'bg-amber-400 text-black' : 'bg-black/50 text-white'}`}
                      title={torchOn ? 'Turn off flashlight' : 'Turn on flashlight'}
                    >
                      {torchOn ? <Flashlight size={16} /> : <FlashlightOff size={16} />}
                    </button>
                  )}
                  <div className="absolute bottom-3 left-0 right-0 text-center text-white text-sm bg-black/40 py-1">
                    Point camera at pack QR
                  </div>
                </div>
              ) : (
                <div onClick={refocusHardwareInput} className="bg-slate-900 rounded-xl overflow-hidden relative pi-camera-container flex flex-col items-center justify-center gap-2 text-center px-4">
                  <ScanBarcode size={40} className="text-blue-400" />
                  <p className="text-white font-semibold text-sm">Ready to Scan</p>
                  <p className="text-slate-400 text-xs">Press the trigger on your scanner</p>
                  <div className="absolute top-2 left-2 bg-indigo-700/80 rounded-lg px-3 py-1.5">
                    <span className="text-white text-xs font-semibold">{warehouse}</span>
                  </div>
                </div>
              )}
              <form onSubmit={submitManual} className="flex gap-2">
                <input
                  ref={scanMode === 'hardware' ? hardwareInputRef : undefined}
                  value={manualId}
                  onChange={e => setManualId(e.target.value)}
                  onBlur={scanMode === 'hardware' ? refocusHardwareInput : undefined}
                  autoFocus={scanMode === 'hardware'}
                  placeholder={scanMode === 'hardware' ? 'Waiting for scan…' : 'Or type / paste Pack ID'}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Button type="submit" disabled={!manualId.trim()} variant="primary" size="sm">
                  Add
                </Button>
              </form>
            </div>

            {/* Scanned / Pending lists */}
            <div className="flex flex-col gap-3">
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-hidden">
                <h3 className="font-semibold text-green-700 mb-2">Scanned ({scanned.length})</h3>
                <div className="overflow-y-auto max-h-36 space-y-1">
                  {scanned.length === 0
                    ? <p className="text-gray-400 text-sm">No bags scanned yet</p>
                    : scanned.map(id => (
                      <div key={id} className="flex items-center justify-between bg-green-50 px-2 py-1 rounded text-sm">
                        <span className="font-mono text-green-800 truncate">{id}</span>
                        <IconButton icon={X} onClick={() => removeScan(id)} variant="danger" size="xs" tooltip="Remove" className="ml-2 flex-shrink-0" />
                      </div>
                    ))}
                </div>
              </div>
              <div className="bg-white border border-gray-200 rounded-xl p-3 flex-1 overflow-hidden">
                <h3 className="font-semibold text-orange-600 mb-2">Pending ({pending.length})</h3>
                <div className="overflow-y-auto max-h-36 space-y-1">
                  {pending.length === 0
                    ? <p className="text-gray-400 text-sm">All scanned!</p>
                    : pending.map(id => (
                      <div key={id} className="font-mono text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded truncate">{id}</div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          <Button
            onClick={submit}
            disabled={!canSubmit || submitting}
            loading={submitting}
            variant={allScanned ? 'success' : canSubmit ? 'primary' : 'secondary'}
            fullWidth
            size="lg"
            className="mt-4"
            icon={allScanned ? CheckCircle2 : undefined}
          >
            {submitting
              ? 'Submitting…'
              : allScanned
                ? `Submit All ${scanned.length} Bags`
                : canSubmit
                  ? `Submit ${scanned.length} Scanned Bag${scanned.length !== 1 ? 's' : ''} (${pending.length} remaining for later)`
                  : 'Scan at least 1 bag to submit'}
          </Button>

          <p className="text-center text-xs text-gray-400 mt-2">
            Progress is saved automatically — you can pause and resume anytime.
          </p>
        </>
      )}
    </div>
  )

  // ─── Setup ───────────────────────────────────────────────────────────────
  const selectedActiveSession = selected
    ? activeSessionMap[`${selected.itemCode}-${selected.lotNo}`]
    : null

  return (
    <div className="p-4 md:p-6 max-w-2xl">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Pack Inward</h2>
      <p className="text-gray-500 text-sm mb-5">
        Scan individual QR bags into the warehouse. Generate packs first in Print Master.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {loadingGroups ? (
        <p className="text-gray-400">Loading pending items…</p>
      ) : pendingGroups.length === 0 && Object.keys(activeSessionMap).length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-4 rounded-lg">
          No packs pending inward. Go to <strong>Print Master</strong> to generate new packs first.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Select Item &amp; Lot *</label>
            <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg p-2 bg-white">
              {pendingGroups.map(g => {
                const sessionKey     = `${g.itemCode}-${g.lotNo}`
                const partialSession = activeSessionMap[sessionKey]
                const scannedCount   = partialSession?.scannedPackIds?.length || 0
                const isSelected     = selected?.itemCode === g.itemCode && selected?.lotNo === g.lotNo

                return (
                  <button
                    key={sessionKey}
                    onClick={() => {
                      setSelected(g)
                      if (partialSession) setWarehouse(partialSession.warehouse || WAREHOUSES[0])
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-blue-900'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{g.itemName}</div>
                        <div className="text-sm text-gray-500">
                          Code: {g.itemCode} | Lot: {g.lotNo} |{' '}
                          <span className="font-semibold text-blue-700">{g.bagCount} bags</span>
                        </div>
                      </div>
                      {partialSession && (
                        <span className="shrink-0 flex items-center gap-1 bg-amber-100 text-amber-700 text-xs font-semibold px-2.5 py-1 rounded-full border border-amber-200 whitespace-nowrap">
                          ⏸ {scannedCount}/{partialSession.expectedBags} scanned
                        </span>
                      )}
                    </div>
                    {partialSession && (
                      <div className="mt-2 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${Math.round((scannedCount / partialSession.expectedBags) * 100)}%` }}
                        />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Warehouse *</label>
            <select
              value={warehouse}
              onChange={e => setWarehouse(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 font-medium"
            >
              {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            {selectedActiveSession ? (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                Session was last using <strong>{selectedActiveSession.warehouse}</strong> — change here if you want to scan remaining bags to a different warehouse.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">
                You can change the warehouse anytime during scanning to route bags to different locations.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => startSession('camera')}
              disabled={!selected || !warehouse || creating}
              loading={creating && scanMode === 'camera'}
              variant="primary"
              icon={Smartphone}
              fullWidth
              size="lg"
              className="flex-1"
            >
              {creating && scanMode === 'camera'
                ? 'Starting…'
                : selectedActiveSession
                  ? `Resume (${selectedActiveSession.scannedPackIds?.length || 0}/${selectedActiveSession.expectedBags})`
                  : 'Phone Scanner'}
            </Button>
            <Button
              onClick={() => startSession('hardware')}
              disabled={!selected || !warehouse || creating}
              loading={creating && scanMode === 'hardware'}
              variant="purple"
              icon={ScanBarcode}
              fullWidth
              size="lg"
              className="flex-1"
            >
              {creating && scanMode === 'hardware'
                ? 'Starting…'
                : selectedActiveSession
                  ? `Resume (${selectedActiveSession.scannedPackIds?.length || 0}/${selectedActiveSession.expectedBags})`
                  : 'Scanner'}
            </Button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {selectedActiveSession
              ? 'Your previous session was paused. Resume with either scan method to continue.'
              : 'Phone Scanner uses your camera · Scanner is for handheld devices like the Zebra TC21'}
          </p>
        </>
      )}
    </div>
  )
}
