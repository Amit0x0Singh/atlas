import QRScanner from '../../../../../../../components/QRScanner/QRScanner.jsx'
import { Button, BackButton } from '../../../../../../../components/ui'
import IssuePanel from './IssuePanel.jsx'

export default function BomChecklistStep({
  selProduct, batchQty, batchUom, batchRef, diNo,
  bomLines, activeIdx, totalDone, totalRequired, progress,
  recipeDrift, onSyncRecipe, onBack, onOpenIssuePanel, onIssueAnother,
  lineMsg,
  showScanner, onOpenScanner, onCloseScanner, onQRScan,
  packs, containers, loadingRes,
  scanInput, setScanInput, scanInputRef, scanErr, setScanErr,
  foundSource, setFoundSource, issueQty, setIssueQty,
  issuing, issueError, onScanInput, onSubmit,
}) {
  return (
    <>
      {showScanner && (
        <QRScanner
          label="Scan Pack or Container QR Code"
          onScan={onQRScan}
          onClose={onCloseScanner}
        />
      )}

      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900">{selProduct?.productName}</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">
                {batchQty} {batchUom}
              </span>
              {batchRef && (
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded-lg font-mono">{batchRef}</span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              {totalDone}/{totalRequired} materials issued
              {progress === 100
                ? <span className="text-green-600 font-bold ml-2">— All Done!</span>
                : <span className="text-gray-400 ml-2">· Progress auto-saved</span>
              }
            </p>
          </div>
          <BackButton onClick={onBack} size="sm" label="Back" />
        </div>

        {/* Progress bar */}
        <div className="h-2 bg-gray-200 rounded-full mb-5 overflow-hidden">
          <div className="h-full bg-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Recipe drift warning */}
        {recipeDrift && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 mb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-800">Recipe has changed since this session started</p>
                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                  {recipeDrift.removed.length > 0 && (
                    <>Removed from recipe: <strong>{recipeDrift.removed.map(l => l.rmName).join(', ')}</strong>. </>
                  )}
                  {recipeDrift.added.length > 0 && (
                    <>Added to recipe: <strong>{recipeDrift.added.map(r => r.rmName).join(', ')}</strong>. </>
                  )}
                  {recipeDrift.changed.length > 0 && (
                    <>Updated: <strong>{recipeDrift.changed.map(l => l.rmName).join(', ')}</strong>. </>
                  )}
                </p>
                {recipeDrift.removed.some(l => l.issued > 0) && (
                  <p className="text-xs text-red-700 mt-1 font-semibold">
                    ⚠ {recipeDrift.removed.filter(l => l.issued > 0).map(l => l.rmName).join(', ')} already has stock issued against it — syncing keeps it flagged for audit, it won't be deleted.
                  </p>
                )}
              </div>
              <button type="button" onClick={onSyncRecipe}
                className="shrink-0 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                Sync to Current Recipe
              </button>
            </div>
          </div>
        )}

        {/* Status matrix */}
        {bomLines.filter(l => !l.orphaned).length > 0 && (() => {
          const activeLines = bomLines.filter(l => !l.orphaned)
          const pending   = activeLines.filter(l => l.issued <= 0).length
          const partial   = activeLines.filter(l => l.issued > 0 && (l.required - l.issued) > 0.001).length
          const complete  = activeLines.filter(l => (l.required - l.issued) <= 0.001).length
          return (
            <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
              <div className="bg-gray-50 border border-gray-200 rounded-xl px-2 sm:px-4 py-3 text-center">
                <p className="text-2xl font-bold text-gray-700">{pending}</p>
                <p className="text-[11px] sm:text-xs font-medium text-gray-500 mt-0.5">Pending</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-2 sm:px-4 py-3 text-center">
                <p className="text-2xl font-bold text-amber-700">{partial}</p>
                <p className="text-[11px] sm:text-xs font-medium text-amber-600 mt-0.5">Partially Issued</p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl px-2 sm:px-4 py-3 text-center">
                <p className="text-2xl font-bold text-green-700">{complete}</p>
                <p className="text-xs font-medium text-green-600 mt-0.5">Fully Issued</p>
              </div>
            </div>
          )
        })()}

        {/* BOM rows */}
        <div className="space-y-2">
          {bomLines.map((line, idx) => {
            if (line.orphaned) {
              return (
                <div key={`${line.rmCode}-${idx}`} className="border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-300 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">!</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-500 text-sm line-through">{line.rmName}</span>
                      <span className="text-xs font-mono text-gray-400">{line.rmCode}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-gray-200 text-gray-600">No longer in recipe</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Previously issued: <strong className="text-gray-700">{line.issued} {line.uom}</strong> — kept here for audit only.
                    </div>
                  </div>
                </div>
              )
            }

            const remaining = Math.max(0, parseFloat((line.required - line.issued).toFixed(3)))
            const done      = remaining <= 0.001
            const partial   = line.issued > 0 && !done
            const isActive  = activeIdx === idx
            const pct       = Math.min(100, Math.round((line.issued / line.required) * 100))

            return (
              <div key={`${line.rmCode}-${idx}`}
                className={`border rounded-xl overflow-hidden transition-all ${
                  done     ? 'border-green-200 bg-green-50' :
                  isActive ? 'border-indigo-400 shadow-sm bg-white' :
                             'border-gray-200 bg-white'
                }`}>

                {/* Row summary */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                    done    ? 'bg-green-500 text-white' :
                    partial ? 'bg-amber-400 text-white' :
                              'bg-gray-200 text-gray-600'
                  }`}>{done ? '✓' : idx + 1}</span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{line.rmName}</span>
                      <span className="text-xs font-mono text-gray-400">{line.rmCode}</span>
                      {line.roleType !== 'INGREDIENT' && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                          line.roleType === 'MICROBE'  ? 'bg-emerald-100 text-emerald-700' :
                          line.roleType === 'CARRIER'  ? 'bg-purple-100 text-purple-700'  :
                                                         'bg-blue-100 text-blue-700'
                        }`}>{line.roleType}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-0.5 text-xs text-gray-500 flex-wrap">
                      <span>Required: <strong className="text-gray-800">{line.required} {line.uom}</strong></span>
                      <span>Issued: <strong className={line.issued > 0 ? 'text-green-700' : 'text-gray-400'}>
                        {line.issued} {line.uom}
                      </strong></span>
                      {!done && remaining > 0 && (
                        <span>Remaining: <strong className="text-red-600">{remaining} {line.uom}</strong></span>
                      )}
                    </div>
                    {lineMsg[idx] && (
                      <p className="text-xs text-green-600 mt-0.5 font-medium">✓ {lineMsg[idx]}</p>
                    )}
                  </div>

                  <div className="flex-shrink-0 w-14 hidden sm:block">
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="text-xs text-center text-gray-400 mt-0.5">{pct}%</div>
                  </div>

                  {done ? (
                    <span className="text-xs font-bold text-green-600 px-2.5 py-1 bg-green-100 rounded-lg flex-shrink-0">
                      Done ✓
                    </span>
                  ) : (
                    <Button onClick={() => onOpenIssuePanel(idx)}
                      variant={isActive ? 'secondary' : 'purple'}
                      size="xs"
                      className="flex-shrink-0">
                      {isActive ? '→ Close' : partial ? 'Issue More' : 'Issue →'}
                    </Button>
                  )}
                </div>

                {/* Issue panel */}
                {isActive && !done && (
                  <IssuePanel
                    line={line}
                    remaining={remaining}
                    packs={packs}
                    containers={containers}
                    loadingRes={loadingRes}
                    scanInput={scanInput}
                    setScanInput={setScanInput}
                    scanInputRef={scanInputRef}
                    scanErr={scanErr}
                    setScanErr={setScanErr}
                    foundSource={foundSource}
                    setFoundSource={setFoundSource}
                    issueQty={issueQty}
                    setIssueQty={setIssueQty}
                    issuing={issuing}
                    issueError={issueError}
                    onScanInput={onScanInput}
                    onOpenScanner={onOpenScanner}
                    onSubmit={onSubmit}
                    selProduct={selProduct}
                    batchQty={batchQty}
                    batchUom={batchUom}
                    batchRef={batchRef}
                    diNo={diNo}
                  />
                )}
              </div>
            )
          })}
        </div>

        {progress === 100 && (
          <div className="mt-5 bg-green-50 border border-green-200 rounded-xl p-5 text-center">
            <p className="text-2xl mb-2">🎉</p>
            <p className="font-bold text-green-800 text-lg">All Materials Issued!</p>
            <p className="text-sm text-green-600 mt-1">
              {selProduct?.productName} — {batchQty} {batchUom} batch ready for production
              {batchRef && ` (Ref: ${batchRef})`}
            </p>
            <Button
              onClick={onIssueAnother}
              variant="success"
              className="mt-4">
              Issue Another Batch
            </Button>
          </div>
        )}
      </div>
    </>
  )
}
