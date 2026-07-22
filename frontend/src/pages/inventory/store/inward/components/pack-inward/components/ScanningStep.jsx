import { Info, Pause } from 'lucide-react'
import { Button, Modal } from '../../../../../../../components/ui'
import MobileScanView from './scanning/MobileScanView.jsx'
import DesktopScanView from './scanning/DesktopScanView.jsx'

export default function ScanningStep({
  isMobile, selected, resumed, showResumedInfo, setShowResumedInfo, onPauseAndExit,
  scanned, pending, ...viewProps
}) {
  return (
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
          <Button onClick={onPauseAndExit} variant="warning" size="sm" icon={Pause}>
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

      {isMobile
        ? <MobileScanView scanned={scanned} pending={pending} {...viewProps} />
        : <DesktopScanView scanned={scanned} pending={pending} {...viewProps} />}
    </div>
  )
}
