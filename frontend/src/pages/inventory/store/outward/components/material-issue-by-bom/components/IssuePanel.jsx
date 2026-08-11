import ScannerPanel from '../../../../../../../components/ScannerPanel/ScannerPanel.jsx'
import StockShortageBanner from './StockShortageBanner.jsx'
import { convertByDensity } from '../../../../../../../utils/uom.js'

import { toTitleCase } from '../../../../../../../utils/textDisplay.js'
export default function IssuePanel({
  line, remaining, rm, packs, containers, loadingRes,
  scanErr, setScanErr,
  foundSource, setFoundSource,
  issueQty, setIssueQty,
  issuing, issueError,
  onScan, onSubmit,
}) {
  // packs/containers always carry stock in the item's Inventory UOM —
  // rm.inventoryUom is the correct label here, not line.uom (the recipe's
  // own declared unit, which for a conversion-required item is commonly a
  // different unit, e.g. Methanol tracked in KG but recipes stated in L).
  const inventoryUom     = rm?.inventoryUom || line.uom
  const totalAvailable   = packs.reduce((s, p) => s + (p.remainingQty || 0), 0)
                         + containers.reduce((s, c) => s + (c.currentQty || 0), 0)
  // `remaining` (prop) is in line.uom; totalAvailable above is always in
  // Inventory UOM (that's what packs/containers track). Comparing the two
  // directly is only valid when they're the same unit — convert
  // totalAvailable into line.uom first so the shortage check and message
  // below don't compare mismatched units for a conversion-required item.
  let totalAvailableInLineUom = totalAvailable
  if (rm) {
    try { totalAvailableInLineUom = convertByDensity(totalAvailable, rm.inventoryUom, line.uom, rm.density).qty }
    catch { totalAvailableInLineUom = totalAvailable }
  }
  const noStock          = !loadingRes && packs.length === 0 && containers.length === 0
  const insufficientStock = !loadingRes && !noStock && totalAvailableInLineUom < remaining

  const rescan = () => { setFoundSource(null); setScanErr(''); setIssueQty('') }

  return (
    <div className="border-t border-indigo-200 bg-white p-4">
      {loadingRes ? (
        <p className="text-sm text-gray-400 text-center py-4">Checking available stock...</p>
      ) : (
        <div className="space-y-4">

          {noStock && (
            <StockShortageBanner
              theme="amber"
              title={`No stock found for ${toTitleCase(line.rmName)}`}
              message="No warehouse packs or containers have stock for this raw material."
            />
          )}

          {insufficientStock && (
            <StockShortageBanner
              theme="orange"
              title={`Stock insufficient for ${toTitleCase(line.rmName)}`}
              message={<>Only <strong>{totalAvailable.toFixed(3)} {inventoryUom}</strong> available but <strong>{remaining} {line.uom}</strong> still needed. You can issue what's available now.</>}
            />
          )}

          {/* ── Scan row — hidden once a source is found, so the camera/
              scanner doesn't keep running behind the result card. Rescan
              (below, next to "Warehouse Pack Found") brings it back. ── */}
          {!foundSource && (
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
                Scan Pack or Container QR Code
              </label>
              <ScannerPanel
                accent="indigo"
                onScan={(val) => { setScanErr(''); setFoundSource(null); onScan(val) }}
                scanHint="Point camera at pack or container QR"
                allowManualEntry={false}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Works with pack bags and containers — one scanner for both.
                Container QR must start with <span className="font-mono">CONT:</span>
              </p>
            </div>
          )}

          {scanErr && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
              {scanErr}
            </div>
          )}

          {/* ── Found source card + issue form ── */}
          {foundSource && (
            <div className={`rounded-xl border overflow-hidden ${
              foundSource.type === 'pack' ? 'border-indigo-200' : 'border-orange-200'
            }`}>
              <div className={`px-4 py-3 text-xs ${
                foundSource.type === 'pack' ? 'bg-indigo-50' : 'bg-orange-50'
              }`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{foundSource.type === 'pack' ? '📦' : '🏺'}</span>
                    <span className={`font-bold text-sm ${foundSource.type === 'pack' ? 'text-indigo-800' : 'text-orange-800'}`}>
                      {foundSource.type === 'pack' ? 'Warehouse Pack Found' : 'Container Found'}
                    </span>
                  </div>
                  <button type="button" onClick={rescan}
                    className="shrink-0 text-xs font-semibold text-gray-500 hover:text-gray-800 bg-white border border-gray-200 hover:border-gray-300 px-2.5 py-1 rounded-lg transition-colors">
                    ↺ Rescan
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-x-3 sm:gap-x-6 gap-y-1 text-gray-600">
                  <div>
                    <span className="text-gray-400">ID: </span>
                    <span className="font-mono font-semibold text-gray-900 break-all">{foundSource.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Available: </span>
                    <span className="font-bold text-green-700">{foundSource.availableQty} {foundSource.uom}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Total Qty: </span>
                    <span className="font-bold text-gray-800">{totalAvailable.toFixed(3)} {inventoryUom}</span>
                  </div>
                  {rm?.conversionRequired && (
                    <div>
                      <span className="text-gray-400">Density: </span>
                      <span className="font-semibold text-gray-700">{rm.density} kg/L</span>
                    </div>
                  )}
                  {foundSource.itemName && (
                    <div>
                      <span className="text-gray-400">Item: </span>
                      <span>{toTitleCase(foundSource.itemName)}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-400">Still needed: </span>
                    <span className="font-bold text-red-600">{remaining} {line.uom}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-white">
                <div className="flex items-end gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-700 mb-1 block">
                      Qty to Issue ({foundSource.entryUom || line.uom})
                    </label>
                    <input type="number" min="0.001" step="0.001"
                      max={foundSource.maxEntryQty ?? Math.min(foundSource.availableQty, remaining)}
                      value={issueQty}
                      onChange={e => setIssueQty(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ${
                        foundSource.type === 'pack'
                          ? 'border-indigo-200 focus:ring-indigo-400'
                          : 'border-orange-200 focus:ring-orange-400'
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max: {(foundSource.maxEntryQty ?? Math.min(foundSource.availableQty, remaining)).toFixed(3)} {foundSource.entryUom || line.uom}
                      {foundSource.entryUom && foundSource.entryUom !== inventoryUom && (
                        <> (stock tracked in {inventoryUom})</>
                      )}
                    </p>
                  </div>
                  <button type="button"
                    onClick={onSubmit}
                    disabled={issuing || !issueQty || parseFloat(issueQty) <= 0}
                    className={`shrink-0 mb-5 px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors disabled:opacity-40 ${
                      foundSource.type === 'pack'
                        ? 'bg-indigo-600 hover:bg-indigo-700'
                        : 'bg-orange-500 hover:bg-orange-600'
                    }`}>
                    {issuing ? 'Issuing...' : 'Issue'}
                  </button>
                </div>
                {issueError && (
                  <p className="text-xs text-red-600 bg-red-50 px-3 py-1.5 rounded border border-red-100 mt-1">
                    {issueError}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
