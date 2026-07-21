import { useRef, useState } from 'react'
import { Download, FolderOpen, Upload } from 'lucide-react'
import * as XLSX from 'xlsx'
import { microbialSfgApi } from '../../../../../api/microbial.js'
import { Button } from '../../../../../components/ui'

export default function MicrobeImport({ onImportDone }) {
  const fileRef = useRef(null)
  const [importRows, setImportRows]       = useState([])
  const [importStatus, setImportStatus]   = useState(null)
  const [importLoading, setImportLoading] = useState(false)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb   = XLSX.read(ev.target.result, { type: 'binary' })
      const ws   = wb.Sheets[wb.SheetNames[0]]
      const rows = XLSX.utils.sheet_to_json(ws)
      setImportRows(rows)
      setImportStatus(null)
    }
    reader.readAsBinaryString(file)
  }

  const handleImport = async () => {
    if (!importRows.length) return
    setImportLoading(true)
    try {
      const res = await microbialSfgApi.importMicrobes(importRows)
      setImportStatus(res)
      onImportDone()
    } catch (err) { alert(err.message) }
    setImportLoading(false)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { 'Microbe Name': 'Bacillus subtilis', 'UOM': 'KG' },
      { 'Microbe Name': 'Trichoderma viride', 'UOM': 'KG' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Microbes')
    XLSX.writeFile(wb, 'microbe_master_template.xlsx')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-base font-bold text-gray-900 mb-1">Import Microbes from Excel</h3>
      <p className="text-sm text-gray-500 mb-5">
        Upload an Excel file with columns: <strong>Microbe Name</strong>, <strong>UOM</strong> (optional, defaults to KG).
        Microbe codes are assigned automatically (mc00001, mc00002, ...) — existing names just get their UOM refreshed.
      </p>

      <div className="flex gap-3 mb-4">
        <Button variant="outline-gray" icon={Download} onClick={downloadTemplate}>Download Template</Button>
        <Button variant="primary" icon={FolderOpen} onClick={() => fileRef.current?.click()}>Choose Excel File</Button>
        <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
      </div>

      {importRows.length > 0 && (
        <>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <p className="text-sm font-semibold text-gray-900 mb-2">Preview — {importRows.length} row(s) detected</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr>{Object.keys(importRows[0]).map(k => (
                    <th key={k} className="text-left px-2.5 py-1.5 font-semibold text-gray-600 bg-gray-100 border-b-2 border-gray-200">{k}</th>
                  ))}</tr>
                </thead>
                <tbody>
                  {importRows.slice(0, 8).map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      {Object.values(r).map((v, j) => <td key={j} className="px-2.5 py-1.5 text-gray-700">{String(v)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {importRows.length > 8 && (
              <p className="text-xs text-gray-400 mt-1.5">…and {importRows.length - 8} more rows</p>
            )}
          </div>
          <Button variant="success" icon={Upload} onClick={handleImport} disabled={importLoading} loading={importLoading}>
            {importLoading ? 'Importing...' : `Import ${importRows.length} Microbe(s)`}
          </Button>
        </>
      )}

      {importStatus && (
        <div className="mt-4 text-sm">
          <div className={`px-4 py-3 rounded-lg ring-1 ring-inset ${importStatus.imported > 0 ? 'bg-green-50 ring-green-200' : 'bg-amber-50 ring-amber-200'} ${importStatus.errors?.length ? 'mb-2.5' : ''}`}>
            <strong className={importStatus.imported > 0 ? 'text-green-700' : 'text-amber-700'}>
              {importStatus.imported > 0 ? 'Import complete' : 'Import finished with issues'}
            </strong>
            <span className="ml-3 text-gray-700">
              <strong className="text-green-700">{importStatus.imported} imported</strong>
              {importStatus.skipped > 0 && <> · <strong className="text-red-600">{importStatus.skipped} skipped</strong></>}
            </span>
          </div>

          {importStatus.imported === 0 && importStatus.skipped > 0 && (
            <div className="px-4 py-3 bg-orange-50 ring-1 ring-inset ring-orange-200 rounded-lg mb-2.5">
              <p className="font-semibold text-orange-700 mb-1.5">Common causes:</p>
              <ul className="list-disc pl-4.5 text-amber-800 leading-relaxed">
                <li>Column header must include <strong>Microbe Name</strong> (case-sensitive)</li>
                <li>Detected columns: <strong>{importRows[0] ? Object.keys(importRows[0]).join(', ') : '—'}</strong></li>
              </ul>
            </div>
          )}

          {importStatus.errors?.length > 0 && (
            <div className="px-4 py-3 bg-red-50 ring-1 ring-inset ring-red-200 rounded-lg">
              <p className="font-semibold text-red-600 mb-1.5">Error details ({importStatus.errors.length}):</p>
              {importStatus.errors.map((e, i) => (
                <div key={i} className={`text-xs text-red-800 py-0.5 ${i < importStatus.errors.length - 1 ? 'border-b border-red-100' : ''}`}>
                  <span className="font-mono bg-red-100 px-1.5 py-0.5 rounded mr-2">{e.row || e.code || `row ${i + 1}`}</span>
                  {e.error}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
