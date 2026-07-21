import { useRef, useState } from 'react'
import { CloudUpload } from 'lucide-react'

const ACCEPT = '.xlsx,.xls,.csv'
// Matches the real multer limit enforced on /import/preview and /import/execute
// (backend/src/routers/routers.js) — not an arbitrary UI-only number.
const MAX_SIZE_LABEL = '50 MB'

export default function UploadZone({ onFile }) {
  const inputRef = useRef(null)
  const [dragOver, setDragOver] = useState(false)

  const pick = () => inputRef.current?.click()

  const handleChange = (e) => {
    const f = e.target.files[0]
    if (f) onFile(f)
    e.target.value = '' // allow re-selecting the same file later
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) onFile(f)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick() }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload Excel file — click or drag and drop"
      onClick={pick}
      onKeyDown={handleKeyDown}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center h-[200px] rounded-xl border-2 border-dashed text-center cursor-pointer transition-colors outline-none
        focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2
        ${dragOver ? 'border-blue-400 bg-blue-50/60' : 'border-gray-200 bg-gray-50/50 hover:border-blue-300 hover:bg-blue-50/30'}`}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} onChange={handleChange} className="hidden" />
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center mb-3 transition-colors ${
        dragOver ? 'bg-blue-100 text-blue-600' : 'bg-white text-gray-400 ring-1 ring-gray-200'
      }`}>
        <CloudUpload size={20} />
      </div>
      <p className="font-semibold text-gray-700 text-sm">
        {dragOver ? 'Drop to upload' : (<>Drop your Excel file here <span className="text-gray-400 font-normal">or click to browse</span></>)}
      </p>
      <p className="text-xs text-gray-400 mt-1">XLSX, XLS or CSV · Max {MAX_SIZE_LABEL}</p>
    </div>
  )
}
