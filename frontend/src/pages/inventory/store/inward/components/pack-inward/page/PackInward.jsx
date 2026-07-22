import { useState, useEffect, useRef } from 'react'
import { inwardApi, packsApi } from '../../../../../../../api/inventory.js'
import { useIsMobile } from '../../../../../../../hooks/useIsMobile.js'
import { STEPS, WAREHOUSES } from '../components/constants.js'
import DoneStep from '../components/DoneStep.jsx'
import SetupStep from '../components/SetupStep.jsx'
import ScanningStep from '../components/ScanningStep.jsx'
import './PackInward.css'

// Scans are validated locally against the packs snapshot fetched once at
// session start (no per-scan network call) and synced to the backend in
// batches instead — debounced during active scanning, or immediately once
// enough scans queue up, so a fast scanning run still stays responsive
// without a request piling up behind every single bag.
const FLUSH_DEBOUNCE_MS = 800
const BATCH_THRESHOLD   = 20
const FLUSH_RETRY_MS    = 3000

// A real scan-gun burst (its full decoded payload, keystroke by keystroke)
// completes in a handful of milliseconds — nothing like human typing speed.
// If the hardware capture buffer goes quiet for longer than this, the burst
// is over: either it terminated normally (buffer's already been cleared by
// then) or it was a code that never matched anything for this session (wrong
// item, damaged label, foreign QR) and the device sent no terminator to flag
// it. SCAN_BURST_IDLE_MS is how long to wait before treating a lingering,
// unmatched buffer as a genuine unrecognized scan instead of staying silent.
const SCAN_BURST_IDLE_MS = 300
const localScanKey = (sessionId) => `inward-scan:${sessionId}`

// Haptic feedback so an operator scanning bag-after-bag doesn't need to
// glance at the screen to know a scan landed — a short single buzz for a
// good scan, a distinct double-buzz for anything rejected (unknown QR,
// duplicate, wrong status). Vibration API is Android-Chrome-only (no iOS
// Safari support) — feature-detected so it's silently a no-op elsewhere.
const vibrateScanOk    = () => navigator.vibrate?.(60)
const vibrateScanError = () => navigator.vibrate?.([80, 60, 80])

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
  const scanBurstTimerRef = useRef(null)     // idle-watchdog for unterminated hardware scans

  useEffect(() => {
    loadGroups()
    return () => {
      stopCamera()
      if (flushTimerRef.current) clearTimeout(flushTimerRef.current)
      if (scanBurstTimerRef.current) clearTimeout(scanBurstTimerRef.current)
    }
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

  // React state clears the controlled value on the *next* render, but a
  // hardware scanner can inject the following bag's keystrokes faster than
  // that commit — they'd land on the input while it still holds the DOM's
  // old raw value and get appended onto it, so the buffer never exact-matches
  // a valid pack ID again. Force the actual DOM value empty synchronously,
  // not just the React state, so nothing can survive between scans.
  const clearScanBuffer = () => {
    if (scanBurstTimerRef.current) { clearTimeout(scanBurstTimerRef.current); scanBurstTimerRef.current = null }
    setManualId('')
    if (hardwareInputRef.current) hardwareInputRef.current.value = ''
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

  // Hardware scanners (Zebra TC21 etc.) vary a lot in how — or whether —
  // they signal "end of scan": some DataWedge profiles send a real Enter
  // keydown (caught below), some send Tab, some send nothing at all and
  // just rely on the app noticing the buffer is complete. Rather than bet
  // on any one terminator, the primary detection is terminator-agnostic:
  // pack IDs for this session are a fixed, known set (packMapRef, built at
  // session start) — so the instant the typed/injected buffer exactly
  // matches one, submit it immediately. That's the one signal every scan
  // gun produces no matter how its suffix key is configured.
  const handleScanBufferKeyDown = (e) => {
    if (e.key !== 'Enter' && e.key !== 'Tab') return
    e.preventDefault()
    const id = e.target.value.trim()
    clearScanBuffer()
    if (!id) return
    doScan(id)
  }

  const handleScanBufferChange = (e) => {
    const raw = e.target.value
    if (scanMode !== 'hardware') { setManualId(raw); return }

    const terminatorIdx = raw.search(/[\r\n\t]/)
    if (terminatorIdx !== -1) {
      const id = raw.slice(0, terminatorIdx).trim()
      clearScanBuffer()
      if (id) doScan(id)
      return
    }

    const trimmed = raw.trim()
    if (trimmed && packMapRef.current.has(trimmed)) {
      clearScanBuffer()
      doScan(trimmed)
      return
    }

    setManualId(raw)

    // Buffer doesn't match anything (yet) — arm the idle-watchdog. If no
    // further keystroke arrives before it fires, this scan burst is done and
    // never resolved into a known pack ID or a terminator: it's a genuinely
    // unrecognized scan (wrong item, damaged label, foreign QR), not a scan
    // still mid-flight. Surface it instead of leaving it to silently corrupt
    // whatever gets scanned next.
    if (scanBurstTimerRef.current) clearTimeout(scanBurstTimerRef.current)
    scanBurstTimerRef.current = setTimeout(() => {
      scanBurstTimerRef.current = null
      const stale = hardwareInputRef.current?.value?.trim()
      if (!stale) return
      vibrateScanError()
      setScanError(`Unrecognized scan: ${stale.length > 60 ? stale.slice(0, 60) + '…' : stale}`)
      clearScanBuffer()
    }, SCAN_BURST_IDLE_MS)
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

  const scanned = session?.scannedPackIds || []
  const pending = session?.pendingPackIds || []

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
    setError(''); setScanError(''); setLastScan(''); clearScanBuffer()
    setWarehouse(WAREHOUSES[0]); setResumed(false)
    loadGroups()
  }

  const handleWarehouseChange = (newWh) => {
    setWarehouse(newWh)
    warehouseRef.current = newWh
    setWarehouseFlash(newWh)
    setTimeout(() => setWarehouseFlash(''), 2500)
  }

  const handleSelectGroup = (g, partialSession) => {
    setSelected(g)
    if (partialSession) setWarehouse(partialSession.warehouse || WAREHOUSES[0])
  }

  const progress   = session ? Math.round((scanned.length / session.expectedBags) * 100) : 0
  const allScanned = session && scanned.length >= session.expectedBags
  const canSubmit  = scanned.length > 0

  if (step === STEPS.DONE) {
    return <DoneStep doneStats={doneStats} selected={selected} onBack={pauseAndExit} />
  }

  if (step === STEPS.SCANNING) {
    return (
      <ScanningStep
        isMobile={isMobile}
        selected={selected}
        resumed={resumed}
        showResumedInfo={showResumedInfo}
        setShowResumedInfo={setShowResumedInfo}
        onPauseAndExit={pauseAndExit}
        videoRef={videoRef}
        canvasRef={canvasRef}
        hardwareInputRef={hardwareInputRef}
        scanMode={scanMode}
        warehouse={warehouse}
        warehouseFlash={warehouseFlash}
        onWarehouseChange={handleWarehouseChange}
        torchSupported={torchSupported}
        torchOn={torchOn}
        onToggleTorch={toggleTorch}
        scanError={scanError}
        lastScan={lastScan}
        manualId={manualId}
        onScanBufferChange={handleScanBufferChange}
        onScanBufferKeyDown={handleScanBufferKeyDown}
        onRefocusHardwareInput={refocusHardwareInput}
        scanned={scanned}
        pending={pending}
        session={session}
        progress={progress}
        allScanned={allScanned}
        canSubmit={canSubmit}
        submitting={submitting}
        onSubmit={submit}
        sheet={sheet}
        setSheet={setSheet}
        scannedSearch={scannedSearch}
        setScannedSearch={setScannedSearch}
        pendingSearch={pendingSearch}
        setPendingSearch={setPendingSearch}
        onUndoLastScan={undoLastScan}
        onRemoveScan={removeScan}
      />
    )
  }

  return (
    <SetupStep
      error={error}
      loadingGroups={loadingGroups}
      pendingGroups={pendingGroups}
      activeSessionMap={activeSessionMap}
      selected={selected}
      warehouse={warehouse}
      creating={creating}
      scanMode={scanMode}
      onSelectGroup={handleSelectGroup}
      onWarehouseChange={setWarehouse}
      onStartSession={startSession}
    />
  )
}
