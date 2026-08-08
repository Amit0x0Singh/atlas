import { Smartphone, ScanBarcode } from 'lucide-react'
import { Button } from '../../../../../../../components/ui'
import { WAREHOUSES } from './constants.js'

import { toTitleCase } from '../../../../../../../utils/textDisplay.js'
export default function SetupStep({
  error, loadingGroups, pendingGroups, activeSessionMap,
  selected, warehouse, creating, scanMode,
  onSelectGroup, onWarehouseChange, onStartSession,
}) {
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
                const scannedCount   = partialSession?.scannedCount || 0
                const isSelected     = selected?.itemCode === g.itemCode && selected?.lotNo === g.lotNo

                return (
                  <button
                    key={sessionKey}
                    onClick={() => onSelectGroup(g, partialSession)}
                    className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-400 text-blue-900'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium">{toTitleCase(g.itemName)}</div>
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
              onChange={e => onWarehouseChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800 font-medium"
            >
              {WAREHOUSES.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
            {selectedActiveSession ? (
              <p className="text-xs text-amber-600 mt-1.5 font-medium">
                Session was last using <strong>{(selectedActiveSession.warehouse || '').toUpperCase()}</strong> — change here if you want to scan remaining bags to a different warehouse.
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-1.5">
                You can change the warehouse anytime during scanning to route bags to different locations.
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => onStartSession('camera')}
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
                  ? `Phone Resume (${selectedActiveSession.scannedCount || 0}/${selectedActiveSession.expectedBags})`
                  : 'Phone Scanner'}
            </Button>
            <Button
              onClick={() => onStartSession('hardware')}
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
                  ? `Gun Scanner Resume (${selectedActiveSession.scannedCount || 0}/${selectedActiveSession.expectedBags})`
                  : 'Gun Scanner'}
            </Button>
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            {selectedActiveSession
              ? 'Your previous session was paused. Resume with either scan method to continue.'
              : 'Phone Scanner uses your camera · Gun Scanner is for handheld devices like the Zebra TC21'}
          </p>
        </>
      )}
    </div>
  )
}
