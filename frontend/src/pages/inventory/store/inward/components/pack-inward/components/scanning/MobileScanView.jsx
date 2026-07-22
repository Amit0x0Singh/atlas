import { X, CheckCircle2, Clock, Search, Undo2, Flashlight, FlashlightOff, ScanBarcode } from 'lucide-react'
import { IconButton, BottomSheet } from '../../../../../../../../components/ui'
import ScanSummaryCard from '../scan-summary-card/ScanSummaryCard.jsx'
import StickySubmitBar from '../sticky-submit-bar/StickySubmitBar.jsx'
import { WAREHOUSES } from '../constants.js'

export default function MobileScanView({
  videoRef, canvasRef, hardwareInputRef,
  scanMode, warehouse, warehouseFlash, onWarehouseChange,
  torchSupported, torchOn, onToggleTorch,
  scanError, lastScan,
  manualId, onScanBufferChange, onScanBufferKeyDown, onRefocusHardwareInput,
  scanned, pending, session, progress,
  allScanned, canSubmit, submitting, onSubmit,
  sheet, setSheet,
  scannedSearch, setScannedSearch, pendingSearch, setPendingSearch,
  onUndoLastScan, onRemoveScan,
}) {
  return (
    <>
      <div className="pb-24">
        {/* Warehouse selector — above the camera, not inside it */}
        <select
          value={warehouse}
          onChange={e => onWarehouseChange(e.target.value)}
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
                onClick={onToggleTorch}
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
            onClick={onRefocusHardwareInput}
            className="bg-slate-900 rounded-2xl overflow-hidden relative mb-2.5 px-5 py-8 flex flex-col items-center gap-3 text-center"
          >
            <ScanBarcode size={36} className="text-blue-400" />
            <p className="text-white font-semibold text-sm">Ready to Scan</p>
            <p className="text-slate-400 text-xs">Press the trigger on your scanner</p>
            {/* Captures the scanner's keyboard-wedge output — kept off-screen
                (not just visually hidden) so focusing it can never trigger
                Android's on-screen keyboard, and inputMode="none" is a second
                layer of the same protection for browsers that'd otherwise
                show it anyway on a focused text input. */}
            <input
              ref={hardwareInputRef}
              value={manualId}
              onChange={onScanBufferChange}
              onKeyDown={onScanBufferKeyDown}
              onBlur={onRefocusHardwareInput}
              autoFocus
              inputMode="none"
              tabIndex={-1}
              aria-hidden="true"
              className="absolute w-px h-px opacity-0 pointer-events-none"
            />
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

      </div>

      <StickySubmitBar
        scannedCount={scanned.length}
        pendingCount={pending.length}
        allScanned={allScanned}
        canSubmit={canSubmit}
        disabled={!canSubmit || submitting}
        loading={submitting}
        onSubmit={onSubmit}
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
              onClick={onUndoLastScan}
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
                  <IconButton icon={X} onClick={() => onRemoveScan(id)} variant="danger" size="xs" tooltip="Remove" />
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
  )
}
