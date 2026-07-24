import { useState, useEffect } from 'react'
import { Camera, ScanBarcode, ArrowRight } from 'lucide-react'
import { useQrScanner } from '../../hooks/useQrScanner.js'
import { useHardwareScanner } from '../../hooks/useHardwareScanner.js'

// Tailwind can't see dynamically-built class strings, so every accent used
// anywhere must be spelled out here in full — one place to add a new color.
const ACCENTS = {
  indigo: { frame: 'border-indigo-400', ring: 'focus:ring-indigo-400', icon: 'text-indigo-400', activeTab: 'text-indigo-700', go: 'hover:border-indigo-300 hover:text-indigo-700' },
  orange: { frame: 'border-orange-400', ring: 'focus:ring-orange-400', icon: 'text-orange-400', activeTab: 'text-orange-700', go: 'hover:border-orange-300 hover:text-orange-700' },
  red:    { frame: 'border-red-400',    ring: 'focus:ring-red-400',    icon: 'text-red-400',    activeTab: 'text-red-700',    go: 'hover:border-red-300 hover:text-red-700' },
  green:  { frame: 'border-green-400',  ring: 'focus:ring-green-400',  icon: 'text-green-400',  activeTab: 'text-green-700',  go: 'hover:border-green-300 hover:text-green-700' },
  blue:   { frame: 'border-blue-400',   ring: 'focus:ring-blue-400',   icon: 'text-blue-400',   activeTab: 'text-blue-700',   go: 'hover:border-blue-300 hover:text-blue-700' },
}

function ManualEntry({ onScan, accent, placeholder }) {
  const [val, setVal] = useState('')
  const submit = () => { if (val.trim()) { onScan(val); setVal('') } }
  return (
    <div className="flex gap-2">
      <input
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
        placeholder={placeholder}
        className={`flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 ${accent.ring}`}
      />
      <button type="button" onClick={submit} disabled={!val.trim()}
        className={`px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg transition-colors disabled:opacity-40 flex items-center gap-1 ${accent.go}`}>
        Go <ArrowRight size={12} />
      </button>
    </div>
  )
}

// One scan surface used everywhere in the app that needs to read a QR code:
// a "Scanner Gun" mode (an always-focused off-screen input capturing a USB/
// Bluetooth barcode gun's keyboard-wedge output — the same mechanism Pack
// Inward pioneered) sitting alongside the phone/laptop camera mode, plus a
// manual-entry fallback that always works regardless of which mode is
// active. Callers only ever see one thing: onScan(value) fires no matter
// which of the three paths produced it.
export default function ScannerPanel({
  onScan,
  accent = 'indigo',
  placeholder = 'Scan or type ID…',
  scanHint = 'Point camera at QR code',
  allowManualEntry = true,
  className = '',
}) {
  const a = ACCENTS[accent] || ACCENTS.indigo
  const [mode, setMode] = useState('hardware')

  const handleScan = (raw) => {
    const value = (raw || '').trim()
    if (value) onScan(value)
  }

  const camera = useQrScanner(handleScan)
  const hw = useHardwareScanner({ onScan: handleScan, active: mode === 'hardware' })

  const switchMode = (next) => {
    if (next === mode) return
    if (mode === 'camera') camera.stop()
    setMode(next)
    if (next === 'camera') camera.start()
  }

  // Camera stream must stop if this panel unmounts mid-scan (e.g. the parent
  // step changes) — useQrScanner only tears down on its own `active` flip.
  useEffect(() => camera.stop, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={className}>
      <div className="inline-flex gap-1 bg-slate-100 p-1 rounded-lg mb-3">
        <button type="button" onClick={() => switchMode('hardware')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            mode === 'hardware' ? `bg-white shadow-sm ${a.activeTab}` : 'text-slate-500 hover:text-slate-700'
          }`}>
          <ScanBarcode size={13} /> Scanner Gun
        </button>
        <button type="button" onClick={() => switchMode('camera')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
            mode === 'camera' ? `bg-white shadow-sm ${a.activeTab}` : 'text-slate-500 hover:text-slate-700'
          }`}>
          <Camera size={13} /> Camera
        </button>
      </div>

      {mode === 'camera' ? (
        <div className="bg-black rounded-xl overflow-hidden relative mb-3 aspect-[4/3] max-h-64">
          <video ref={camera.videoRef} className="w-full h-full object-cover" playsInline muted />
          <canvas ref={camera.canvasRef} className="hidden" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className={`w-40 h-40 border-2 rounded-lg ${a.frame}`} />
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">{scanHint}</div>
          {camera.camError && (
            <div className="absolute inset-0 bg-black/90 flex items-center justify-center p-4">
              <p className="text-red-300 text-xs text-center">{camera.camError}</p>
            </div>
          )}
        </div>
      ) : (
        <div onClick={hw.refocus} className="bg-slate-900 rounded-xl mb-3 flex flex-col items-center justify-center gap-1.5 text-center py-7 cursor-text relative">
          <ScanBarcode size={30} className={a.icon} />
          <p className="text-white font-semibold text-sm">Ready to Scan</p>
          <p className="text-slate-400 text-xs">Press the trigger on your scanner</p>
          {/* Off-screen (not just visually hidden) so focusing it can never
              trigger a mobile on-screen keyboard; inputMode="none" doubles up. */}
          <input
            ref={hw.inputRef}
            value={hw.value}
            onChange={hw.handleChange}
            onKeyDown={hw.handleKeyDown}
            onBlur={hw.refocus}
            autoFocus
            inputMode="none"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute w-px h-px opacity-0 pointer-events-none"
          />
        </div>
      )}

      {allowManualEntry && <ManualEntry onScan={handleScan} accent={a} placeholder={placeholder} />}
    </div>
  )
}
