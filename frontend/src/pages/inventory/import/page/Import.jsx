import { useState, useRef } from 'react'
import { Upload, ScanSearch, CloudUpload, CircleX, Download, BookOpen } from 'lucide-react'
import { importApi } from '../../../../api/inventory.js'
import { BackButton, Button, PageHeader, BottomSheet } from '../../../../components/ui'
import ImportStepper from '../components/import-stepper/ImportStepper.jsx'
import UploadZone from '../components/upload-zone/UploadZone.jsx'
import SelectedFileCard from '../components/upload-zone/SelectedFileCard.jsx'
import AnalysisSummary from '../components/analysis-summary/AnalysisSummary.jsx'
import ResultSummary from '../components/result-summary/ResultSummary.jsx'
import FormatGuide from '../components/format-guide/FormatGuide.jsx'
import { downloadImportTemplate } from '../utils/downloadTemplate.js'

export default function Import() {
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [executing, setExecuting] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [mobileGuideOpen, setMobileGuideOpen] = useState(false)
  const changeFileInputRef = useRef(null)

  // Reflects what the backend has actually done so far — see ImportStepper
  // for why this is 3 stages (Upload / Analyze / Import) rather than a
  // 4-stage pipeline with a separate pre-import validation stage.
  const step = result ? 'done' : preview ? 'import' : 'analyze'

  const selectFile = (f) => {
    setFile(f); setPreview(null); setResult(null); setError('')
  }

  const removeFile = () => {
    setFile(null); setPreview(null); setResult(null); setError('')
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true); setError(''); setPreview(null); setResult(null)
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
    if (!file) return
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
        title="Import Master Data"
        description="Upload Excel sheets to create or update master records in bulk."
        actions={<BackButton />}
      />

      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_400px] gap-6 items-start">
        <div className="max-w-2xl w-full min-w-0">
          <ImportStepper current={file ? step : 'upload'} />

          {/* Mobile-only: open the format guide as a bottom sheet instead of a sidebar */}
          <button
            type="button"
            onClick={() => setMobileGuideOpen(true)}
            className="lg:hidden w-full flex items-center justify-center gap-2 text-sm font-semibold text-blue-600 bg-blue-50 ring-1 ring-inset ring-blue-100 rounded-xl px-4 py-2.5 mb-4"
          >
            <BookOpen size={15} /> View Excel Format Guide
          </button>

          {/* Upload area / selected file */}
          {file ? (
            <>
              <SelectedFileCard
                file={file}
                sheetCount={preview?.totalSheets}
                onChange={() => changeFileInputRef.current?.click()}
                onRemove={removeFile}
              />
              {/* Only needed for the "Change File" action — UploadZone owns its own input for the empty state. */}
              <input
                ref={changeFileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => { if (e.target.files[0]) selectFile(e.target.files[0]); e.target.value = '' }}
                className="hidden"
              />
            </>
          ) : (
            <UploadZone onFile={selectFile} />
          )}

          <button
            type="button"
            onClick={downloadImportTemplate}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-blue-600 mt-3 mb-5"
          >
            <Download size={13} /> Download Excel Template
          </button>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 ring-1 ring-inset ring-red-100 text-red-700 px-4 py-3 rounded-xl mb-4 text-sm">
              <CircleX size={16} className="shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          {/* Primary action — Import only appears once analysis has actually run,
              so there's never a moment where an untouched file can be imported
              without first being previewed. */}
          <div className="flex gap-3 mb-6">
            {!preview ? (
              <Button variant="outline" icon={ScanSearch} fullWidth loading={loading} disabled={!file} onClick={analyze}>
                {loading ? 'Analyzing workbook...' : 'Analyze & Preview'}
              </Button>
            ) : (
              <>
                <Button variant="outline" icon={ScanSearch} loading={loading} disabled={loading || executing} onClick={analyze}>
                  Re-analyze
                </Button>
                <Button variant="success" icon={CloudUpload} fullWidth loading={executing} disabled={executing} onClick={execute}>
                  {executing ? 'Importing...' : 'Import to Database'}
                </Button>
              </>
            )}
          </div>
          {loading && (
            <p className="text-xs text-gray-400 -mt-4 mb-6">Reading sheets and checking column headers…</p>
          )}

          {preview && !result && <AnalysisSummary preview={preview} />}
          {result && <ResultSummary result={result} />}
        </div>

        {/* Desktop sidebar */}
        <div className="hidden lg:block min-w-0 lg:sticky lg:top-6">
          <FormatGuide />
        </div>
      </div>

      {/* Mobile drawer */}
      <BottomSheet open={mobileGuideOpen} onClose={() => setMobileGuideOpen(false)} title="Excel File Format Guide">
        <FormatGuide />
      </BottomSheet>
    </div>
  )
}
