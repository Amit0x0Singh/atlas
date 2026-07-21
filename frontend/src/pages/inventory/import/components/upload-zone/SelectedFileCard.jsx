import { FileSpreadsheet, RefreshCw, X } from 'lucide-react'

export default function SelectedFileCard({ file, sheetCount, onChange, onRemove }) {
  return (
    <div className="flex items-center gap-3 h-[200px] rounded-xl border border-gray-200 bg-white px-6">
      <div className="w-11 h-11 rounded-lg bg-green-50 text-green-600 flex items-center justify-center shrink-0">
        <FileSpreadsheet size={20} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-gray-900 truncate">{file.name}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {(file.size / 1024).toFixed(1)} KB
          {sheetCount != null && <> · {sheetCount} sheet{sheetCount !== 1 ? 's' : ''} detected</>}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={onChange}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors"
        >
          <RefreshCw size={13} /> Change File
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove selected file"
          className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
