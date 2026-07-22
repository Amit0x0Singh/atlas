import { X, CheckCircle2, Flashlight, FlashlightOff, ScanBarcode } from 'lucide-react'
import { Button, IconButton } from '../../../../../../../../components/ui'
import { WAREHOUSES } from '../constants.js'

export default function DesktopScanView({
  videoRef, canvasRef, hardwareInputRef,
  scanMode, warehouse, warehouseFlash, onWarehouseChange,
  torchSupported, torchOn, onToggleTorch,
  scanError, lastScan,
  manualId, onScanBufferChange, onScanBufferKeyDown, onRefocusHardwareInput,
  scanned, pending, session, progress, allScanned, canSubmit, submitting, onSubmit,
  onRemoveScan,
}) {
  return (
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
          onChange={e => onWarehouseChange(e.target.value)}
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
                  onClick={onToggleTorch}
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
            <div onClick={onRefocusHardwareInput} className="bg-slate-900 rounded-xl overflow-hidden relative pi-camera-container flex flex-col items-center justify-center gap-2 text-center px-4">
              <ScanBarcode size={40} className="text-blue-400" />
              <p className="text-white font-semibold text-sm">Ready to Scan</p>
              <p className="text-slate-400 text-xs">Press the trigger on your scanner</p>
              <div className="absolute top-2 left-2 bg-indigo-700/80 rounded-lg px-3 py-1.5">
                <span className="text-white text-xs font-semibold">{warehouse}</span>
              </div>
            </div>
          )}
          {/* Captures the scanner's keyboard-wedge output — kept off-screen
              (not just visually hidden) so focusing it can never trigger
              Android's on-screen keyboard; inputMode="none" is a second
              layer of the same protection. */}
          {scanMode === 'hardware' && (
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
          )}
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
                    <IconButton icon={X} onClick={() => onRemoveScan(id)} variant="danger" size="xs" tooltip="Remove" className="ml-2 flex-shrink-0" />
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
        onClick={onSubmit}
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
  )
}
