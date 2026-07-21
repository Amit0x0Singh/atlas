import { ScanSearch, Layers, ListChecks } from 'lucide-react'
import ResultCard from '../result-card/ResultCard.jsx'

// Preview only tells us sheet/column structure — not row-level validity
// (that only becomes known once execute() actually writes the rows) — so
// these stats and this table are strictly structural, not a validation report.
export default function AnalysisSummary({ preview }) {
  const sheetNames = preview.sheets || []
  const recognized = sheetNames.filter(s => !(preview.detectedAs?.[s] || '').includes('skipped'))
  const totalRows = recognized.reduce((sum, s) => sum + (preview.summary[s]?.rowCount || 0), 0)

  return (
    <div className="rounded-xl border border-gray-100 p-5">
      <div className="flex items-center gap-2 mb-4">
        <ScanSearch size={16} className="text-blue-500" />
        <h2 className="font-bold text-gray-900 text-sm">Analysis Summary</h2>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <ResultCard icon={Layers}      label="Sheets Found"  value={sheetNames.length}   color="text-gray-700" />
        <ResultCard icon={ListChecks}  label="Recognized"    value={recognized.length}   color="text-blue-700" />
        <ResultCard icon={ScanSearch}  label="Rows to Import" value={totalRows}          color="text-green-700" />
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-100">
        <table className="text-xs w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Sheet</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Rows</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Detected As</th>
              <th className="px-3 py-2 text-left font-semibold text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody>
            {sheetNames.map(sheet => {
              const info = preview.summary[sheet] || { rowCount: 0 }
              const detected = preview.detectedAs?.[sheet] || ''
              const skipped = detected.includes('skipped')
              const autoDetect = detected.includes('auto-detected')
              return (
                <tr key={sheet} className="border-t border-gray-100">
                  <td className="px-3 py-2 font-medium text-gray-800">{sheet}</td>
                  <td className="px-3 py-2 text-gray-500">{info.rowCount}</td>
                  <td className="px-3 py-2 text-gray-500">{detected.replace(' (auto-detected by columns)', '').replace(' (auto-detected — filename match)', '')}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${
                      skipped ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' :
                      autoDetect ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                      'bg-green-50 text-green-700 ring-green-200'
                    }`}>
                      {skipped ? 'Not Recognized' : autoDetect ? 'Auto-detected' : 'Ready'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
