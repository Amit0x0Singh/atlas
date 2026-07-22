import { useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { Download, FolderOpen, Upload, X } from 'lucide-react'
import { Modal, Button } from '../../../../../components/ui'

export default function InwardImportModal({ open, onClose, onImport, importing }) {
  const fileRef = useRef(null)
  const [rows, setRows] = useState([])
  const [status, setStatus] = useState(null)

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const wb = XLSX.read(ev.target.result, { type: 'binary', cellDates: true })
      const ws = wb.Sheets[wb.SheetNames[0]]
      setRows(XLSX.utils.sheet_to_json(ws, { raw: false, dateNF: 'yyyy-mm-dd' }))
      setStatus(null)
    }
    reader.readAsBinaryString(file)
  }

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([{
      'Microbe Name': 'Bacillus subtilis', 'Container Code': 'BS001-WP-001', 'Microbe Type': 'Wettable Powder',
      'Inhouse CFU/g': '5e10', 'Biomass Batch Code': 'BB-2026-001', 'Date of Harvest': '2026-04-01',
      'Total Qty (kg)': 10, Location: 'CR-A-01', Moisture: 8.5, 'Shelf Life (days)': 180, 'Fill Status': 'PARTIAL',
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Microbial Inward')
    XLSX.writeFile(wb, 'microbial_inward_template.xlsx')
  }

  const handleImport = async () => {
    if (!rows.length) return
    const res = await onImport(rows)
    setStatus(res)
  }

  const handleClose = () => { setRows([]); setStatus(null); onClose() }

  return (
    <Modal open={open} onClose={handleClose} size="xl">
      <div className="p-6 max-h-[85vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Import Inward Records from Excel</h2>
        <p className="text-sm text-gray-500 mb-5">
          Columns: Microbe Name, Container Code, Microbe Type, Inhouse CFU/g, Biomass Batch Code, Date of Harvest, Total Qty (kg), Location, Moisture, Shelf Life (days), Fill Status
        </p>

        <div className="flex gap-3 mb-4">
          <Button variant="outline-gray" icon={Download} onClick={downloadTemplate}>Download Template</Button>
          <Button variant="primary" icon={FolderOpen} onClick={() => fileRef.current?.click()}>Choose Excel File</Button>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} />
        </div>

        {rows.length > 0 && (
          <>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 overflow-x-auto">
              <p className="text-sm font-semibold text-gray-900 mb-2">Preview — {rows.length} row(s) detected</p>
              <table className="w-full text-xs">
                <thead><tr>{Object.keys(rows[0]).map((k) => <th key={k} className="text-left px-2.5 py-1.5 font-semibold text-gray-600 bg-gray-100 border-b-2 border-gray-200">{k}</th>)}</tr></thead>
                <tbody>
                  {rows.slice(0, 6).map((r, i) => (
                    <tr key={i} className="border-b border-gray-100">{Object.values(r).map((v, j) => <td key={j} className="px-2.5 py-1.5 text-gray-700">{String(v)}</td>)}</tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 6 && <p className="text-xs text-gray-400 mt-1.5">…and {rows.length - 6} more rows</p>}
            </div>
            <Button variant="success" icon={Upload} onClick={handleImport} disabled={importing} loading={importing}>
              {importing ? 'Importing...' : `Import ${rows.length} Record(s)`}
            </Button>
          </>
        )}

        {status && (
          <div className="mt-4 text-sm px-4 py-3 rounded-lg ring-1 ring-inset bg-green-50 ring-green-200">
            <strong className="text-green-700">Done:</strong>{' '}
            <span className="text-gray-700"><strong className="text-green-700">{status.imported}</strong> imported · <strong className="text-red-600">{status.skipped}</strong> skipped</span>
            {status.errors?.length > 0 && (
              <div className="mt-2 text-xs text-red-700 space-y-0.5">
                {status.errors.slice(0, 5).map((e, i) => <div key={i}>{e.row}: {e.error}</div>)}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end mt-5">
          <Button variant="secondary" icon={X} onClick={handleClose}>Close</Button>
        </div>
      </div>
    </Modal>
  )
}
