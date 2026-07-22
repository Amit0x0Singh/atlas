import { Camera } from 'lucide-react'
import { IconButton } from '../../../../../../../components/ui'
import StockShortageBanner from './StockShortageBanner.jsx'

export default function IssuePanel({
  line, remaining, packs, containers, loadingRes,
  scanInput, setScanInput, scanInputRef,
  scanErr, setScanErr,
  foundSource, setFoundSource,
  issueQty, setIssueQty,
  issuing, issueError,
  onScanInput, onOpenScanner, onSubmit,
  // context for purchase indent
  selProduct, batchQty, batchUom, batchRef, diNo,
}) {
  const totalAvailable   = packs.reduce((s, p) => s + (p.remainingQty || 0), 0)
                         + containers.reduce((s, c) => s + (c.currentQty || 0), 0)
  const noStock          = !loadingRes && packs.length === 0 && containers.length === 0
  const insufficientStock = !loadingRes && !noStock && totalAvailable < remaining

  return (
    <div className="border-t border-indigo-200 bg-white p-4">
      {loadingRes ? (
        <p className="text-sm text-gray-400 text-center py-4">Checking available stock...</p>
      ) : (
        <div className="space-y-4">

          {noStock && (
            <StockShortageBanner
              theme="amber"
              title={`No stock found for ${line.rmName}`}
              message="No warehouse packs or containers have stock for this raw material. Raise a purchase indent so the purchasing team can procure it."
              selProduct={selProduct} batchQty={batchQty} batchUom={batchUom} batchRef={batchRef} diNo={diNo}
            />
          )}

          {insufficientStock && (
            <StockShortageBanner
              theme="orange"
              title={`Stock insufficient for ${line.rmName}`}
              message={<>Only <strong>{totalAvailable.toFixed(3)} {line.uom}</strong> available but <strong>{remaining} {line.uom}</strong> still needed. You can issue what's available now and raise an indent for the shortfall.</>}
              selProduct={selProduct} batchQty={batchQty} batchUom={batchUom} batchRef={batchRef} diNo={diNo}
            />
          )}

          {/* ── Scan row ── */}
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1.5 block">
              Scan Pack or Container QR Code
            </label>
            <div className="flex gap-2">
              <IconButton icon={Camera} onClick={onOpenScanner} tooltip="Open camera scanner" variant="purple" size="md" />
              <input
                ref={scanInputRef}
                value={scanInput}
                onChange={e => { setScanInput(e.target.value); setScanErr(''); setFoundSource(null) }}
                onKeyDown={e => { if (e.key === 'Enter' && scanInput.trim()) onScanInput(scanInput) }}
                placeholder="Scan QR code or type Pack / Container ID..."
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <button
                type="button"
                onClick={() => scanInput.trim() && onScanInput(scanInput)}
                disabled={!scanInput.trim()}
                className="px-3 py-2 text-xs font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition-colors">
                Find
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Works with pack bags and containers — one scanner for both.
              Container QR must start with <span className="font-mono">CONT:</span>
            </p>
          </div>

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
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-base">{foundSource.type === 'pack' ? '📦' : '🏺'}</span>
                  <span className={`font-bold text-sm ${foundSource.type === 'pack' ? 'text-indigo-800' : 'text-orange-800'}`}>
                    {foundSource.type === 'pack' ? 'Warehouse Pack Found' : 'Container Found'}
                  </span>
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
                  {foundSource.lotNo && (
                    <div>
                      <span className="text-gray-400">Lot: </span>
                      <span>{foundSource.lotNo} · Bag #{foundSource.bagNo}</span>
                    </div>
                  )}
                  {foundSource.supplier && (
                    <div>
                      <span className="text-gray-400">Supplier: </span>
                      <span>{foundSource.supplier}</span>
                    </div>
                  )}
                  {foundSource.itemName && (
                    <div>
                      <span className="text-gray-400">Item: </span>
                      <span>{foundSource.itemName}</span>
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
                      Qty to Issue ({line.uom})
                    </label>
                    <input type="number" min="0.001" step="0.001"
                      max={Math.min(foundSource.availableQty, remaining)}
                      value={issueQty}
                      onChange={e => setIssueQty(e.target.value)}
                      className={`w-full border rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 ${
                        foundSource.type === 'pack'
                          ? 'border-indigo-200 focus:ring-indigo-400'
                          : 'border-orange-200 focus:ring-orange-400'
                      }`}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Max: {Math.min(foundSource.availableQty, remaining).toFixed(3)} {line.uom}
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

          {/* ── Prompt when nothing scanned yet ── */}
          {!foundSource && !scanErr && !noStock && (
            <div className="text-center py-4">
              <button type="button" onClick={onOpenScanner}
                className="flex items-center gap-2 mx-auto px-4 py-2 border border-indigo-300 text-indigo-700 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors">
                Open Camera Scanner
              </button>
              <p className="text-xs text-gray-400 mt-2">or type / scan the ID in the field above</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
