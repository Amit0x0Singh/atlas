import { useState, useRef } from 'react'
import {
  Upload, CloudUpload, FileSpreadsheet, ScanSearch, CircleCheckBig, TriangleAlert,
  CircleX, Info, Repeat2, Ban, FlaskConical, Layers, GitBranch, Wrench, Building,
  Printer, ArrowDownToLine, ArrowUpFromLine,
} from 'lucide-react'
import { importApi } from '../../../../api/inventory.js'
import { BackButton, Button, PageHeader } from '../../../../components/ui'
import ResultCard from '../components/result-card/ResultCard.jsx'
import FormatGuide from '../components/format-guide/FormatGuide.jsx'

export default function Import() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (!f) return
    setFile(f); setPreview(null); setResult(null); setError('')
  }

  const analyze = async () => {
    if (!file) { setError('Please select a file first'); return }
    setLoading(true); setError(''); setPreview(null)
    try {
      const res = await importApi.preview(file)
      setPreview(res.data)
    } catch (e) {
      setError('Preview failed: ' + e.message)
    } finally {
      setLoading(false)
    }
  }

  const execute = async () => {
    if (!file) { setError('Please select a file first'); return }
    if (!confirm('This will import data into the database. Continue?')) return
    setExecuting(true); setError(''); setResult(null)
    try {
      const res = await importApi.execute(file)
      setResult(res.data)
    } catch (e) {
      setError('Import failed: ' + e.message)
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Upload}
        title="Import Legacy Data"
        description="Upload your existing Excel file to bring historical data into the system"
        actions={<BackButton />}
      />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,400px)] gap-6 items-start">
      <div className="max-w-2xl w-full">
        {/* Upload area */}
        <div
          onClick={() => inputRef.current?.click()}
          className={`group rounded-2xl p-8 text-center mb-6 cursor-pointer transition-colors border-2 border-dashed ${
            file ? 'border-blue-300 bg-blue-50/40' : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
          }`}
        >
          <input ref={inputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" />
          <div className={`mx-auto mb-3 w-14 h-14 rounded-xl flex items-center justify-center transition-colors ${
            file ? 'bg-blue-100 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-500'
          }`}>
            {file ? <FileSpreadsheet size={26} /> : <CloudUpload size={26} />}
          </div>
          {file ? (
            <div>
              <p className="font-semibold text-gray-900">{file.name}</p>
              <p className="text-sm text-gray-500 mt-0.5">{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </div>
          ) : (
            <div>
              <p className="font-semibold text-gray-700">Click to upload Excel file</p>
              <p className="text-sm text-gray-400 mt-1">Supports .xlsx, .xls, .csv</p>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 bg-red-50 ring-1 ring-inset ring-red-100 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
            <CircleX size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        <div className="flex gap-3 mb-6">
          <Button variant="outline" icon={ScanSearch} fullWidth loading={loading} disabled={!file} onClick={analyze}>
            {loading ? 'Analyzing...' : 'Analyze & Preview'}
          </Button>
          <Button variant="success" icon={CloudUpload} fullWidth loading={executing} disabled={!file} onClick={execute}>
            {executing ? 'Importing...' : 'Import to Database'}
          </Button>
        </div>

        {/* Preview results */}
        {preview && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <ScanSearch size={16} className="text-blue-500" />
              <h2 className="font-bold text-gray-900">File Preview</h2>
              <span className="text-sm text-gray-400">· {preview.totalSheets} sheet{preview.totalSheets !== 1 ? 's' : ''} found</span>
            </div>
            <div className="space-y-5">
              {Object.entries(preview.summary).map(([sheet, info]) => {
                const detected = preview.detectedAs?.[sheet] || ''
                const skipped = detected.includes('skipped')
                const autoDetect = detected.includes('auto-detected')
                return (
                  <div key={sheet} className="rounded-xl border border-gray-100 p-4">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-gray-800">{sheet}</span>
                      <span className="text-gray-400 text-xs">({info.rowCount} rows)</span>
                      {detected && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${
                          skipped ? 'bg-yellow-50 text-yellow-700 ring-yellow-200' :
                          autoDetect ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                          'bg-green-50 text-green-700 ring-green-200'
                        }`}>
                          {detected}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 mb-2">Columns: {info.columns.join(', ')}</div>
                    {info.sample.length > 0 && !skipped && (
                      <div className="overflow-x-auto rounded-lg border border-gray-100">
                        <table className="text-xs w-full">
                          <thead className="bg-gray-50">
                            <tr>{info.columns.map(c => <th key={c} className="px-2.5 py-1.5 border-r border-gray-100 text-left font-semibold text-gray-600 last:border-r-0">{c}</th>)}</tr>
                          </thead>
                          <tbody>
                            {info.sample.map((row, i) => (
                              <tr key={i} className="border-t border-gray-100">
                                {info.columns.map(c => <td key={c} className="px-2.5 py-1.5 border-r border-gray-50 text-gray-600 last:border-r-0">{String(row[c] || '')}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="flex items-start gap-2 bg-blue-50 ring-1 ring-inset ring-blue-100 px-4 py-3 rounded-xl mt-4 text-sm text-blue-800">
              <CircleCheckBig size={16} className="shrink-0 mt-0.5" />
              Review the detected sheet types above, then click <strong>&nbsp;"Import to Database"</strong>.
            </div>
          </div>
        )}

        {/* Import result */}
        {result && (
          <div className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <CircleCheckBig size={18} className="text-green-500" />
              <h2 className="font-bold text-gray-900">Import Complete</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <ResultCard icon={FlaskConical}     label="Products" value={result.productMaster} color="text-violet-700" />
              <ResultCard icon={Layers}           label="RM Items" value={result.rmMaster} color="text-green-700" />
              <ResultCard icon={GitBranch}        label="Recipe/BOM Lines" value={result.recipeBom} color="text-teal-700" />
              <ResultCard icon={Wrench}           label="Equipment" value={result.equipmentMaster} color="text-blue-700" />
              <ResultCard icon={Building}          label="Suppliers" value={result.supplierMaster} color="text-pink-700" />
              <ResultCard icon={Printer}           label="Packs Imported" value={result.printMaster} color="text-indigo-700" />
              <ResultCard icon={ArrowDownToLine}   label="Inward Records" value={result.inward} color="text-orange-700" />
              <ResultCard icon={ArrowUpFromLine}   label="Outward Records" value={result.outward} color="text-red-700" />
              {result.unmatchedRm > 0 && <ResultCard icon={CircleX} label='Unmatched RM (item code "NaN")' value={result.unmatchedRm} color="text-red-700" />}
              {result.missingQtyOrUom > 0 && <ResultCard icon={TriangleAlert} label="Missing Qty/UOM" value={result.missingQtyOrUom} color="text-amber-700" />}
              {result.duplicateRecipeLineExtraRows > 0 && <ResultCard icon={Repeat2} label="Duplicate BOM Rows" value={result.duplicateRecipeLineExtraRows} color="text-fuchsia-700" />}
              {result.skippedMissingProductOrRm > 0 && <ResultCard icon={Ban} label="Skipped (no Product/RM)" value={result.skippedMissingProductOrRm} color="text-gray-600" />}
            </div>

            {result.duplicateRecipeLines?.length > 0 && (
              <div className="mt-4 bg-fuchsia-50 ring-1 ring-inset ring-fuchsia-100 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <Repeat2 size={15} className="text-fuchsia-500 shrink-0 mt-0.5" />
                  <p className="text-fuchsia-800 text-xs font-medium leading-relaxed">
                    {result.duplicateRecipeLines.length} product+ingredient combo(s) appeared more than once in the sheet
                    ({result.duplicateRecipeLineExtraRows} extra row{result.duplicateRecipeLineExtraRows !== 1 ? 's' : ''} total) —
                    recipe_db can only store one qty per product+ingredient, so only the <strong>last</strong> occurrence's qty/uom was kept for each:
                  </p>
                </div>
                <div className="max-h-40 overflow-y-auto mt-2 ml-6 space-y-0.5">
                  {result.duplicateRecipeLines.map((d, i) => (
                    <p key={i} className="text-fuchsia-700 text-xs">"{d.rmName}" in "{d.productName}" — appeared {d.occurrences}× in the sheet</p>
                  ))}
                </div>
                <p className="text-fuchsia-700 text-xs mt-2 ml-6">
                  If these should really be separate lines (e.g. two additions of the same ingredient), sum them into one row in the source file before re-importing — the database can't hold two quantities for the same product+ingredient pair.
                </p>
              </div>
            )}

            {result.skippedMissingProductOrRm > 0 && (
              <div className="mt-4 bg-gray-50 ring-1 ring-inset ring-gray-100 rounded-xl p-4 flex items-start gap-2">
                <Ban size={15} className="text-gray-400 shrink-0 mt-0.5" />
                <p className="text-gray-700 text-xs font-medium leading-relaxed">
                  {result.skippedMissingProductOrRm} row(s) were skipped entirely — blank Product Name and/or Raw Material. See the row-level warnings below for which ones.
                </p>
              </div>
            )}

            {result.unmatchedRm > 0 && (
              <div className="mt-4 bg-red-50 ring-1 ring-inset ring-red-100 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <CircleX size={15} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-red-800 text-xs font-medium leading-relaxed">
                    {result.unmatchedRm} recipe row(s) had no exact name match in Raw Material Master — imported anyway, unchanged name, with item code "NaN" (or "NaN-2", "NaN-3"… per product) instead of being skipped:
                  </p>
                </div>
                <p className="text-red-700 text-xs mt-1.5 ml-6">
                  Add the missing RM(s) to RM Master with this exact name, then use <strong>Recipe DB → Fix RM Mapping</strong> to reconcile these "NaN" codes to the real item.
                </p>
              </div>
            )}

            {result.missingQtyOrUom > 0 && (
              <div className="mt-4 bg-amber-50 ring-1 ring-inset ring-amber-100 rounded-xl p-4">
                <div className="flex items-start gap-2">
                  <TriangleAlert size={15} className="text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-amber-800 text-xs font-medium leading-relaxed">
                    {result.missingQtyOrUom} recipe row(s) had a blank or non-numeric Qty Per Unit and/or blank UOM — imported anyway instead of being skipped, with qty set to 0 and/or uom set to "NaN":
                  </p>
                </div>
                <p className="text-amber-700 text-xs mt-1.5 ml-6">
                  Open <strong>Recipe DB</strong> for the affected product(s) and fill in the correct qty/uom for any ingredient showing 0 or "NaN".
                </p>
              </div>
            )}

            {result.errors?.length > 0 && (
              <div className="mt-4 bg-yellow-50 ring-1 ring-inset ring-yellow-100 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-1">
                  <Info size={15} className="text-yellow-600 shrink-0 mt-0.5" />
                  <p className="text-yellow-800 text-sm font-medium">{result.errors.length} row-level warning(s):</p>
                </div>
                <div className="ml-6 space-y-0.5">
                  {result.errors.slice(0, 8).map((e, i) => <p key={i} className="text-yellow-700 text-xs">{e}</p>)}
                  {result.errors.length > 8 && <p className="text-yellow-600 text-xs mt-1">…and {result.errors.length - 8} more</p>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="min-w-0 lg:sticky lg:top-6">
        <FormatGuide />
      </div>
      </div>
    </div>
  )
}
