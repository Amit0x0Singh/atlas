import { useState, useRef } from 'react'
import { ClipboardPaste, CheckCircle2 } from 'lucide-react'

// Parses one pasted schedule row and auto-detects Format 1 (7 cols) vs Format 2 (11 cols) —
// same column mapping as the legacy handleSchedulePaste().
function parseSchedulePaste(text) {
  const row  = text.split(/\r?\n/)[0]
  const vals = row.split('\t')

  if (vals.length >= 10) {
    const location  = (vals[3] || '').trim()
    const equipment = (vals[6] || '').trim()
    return {
      label: 'Format 2 detected (11-col schedule)',
      patch: {
        batchIncharge: vals[0]?.trim() || '',
        diNumber:      vals[1]?.trim() || '',
        shift:         vals[2]?.trim() || '',
        reactor:       location || equipment,
        product:       vals[4]?.trim() || '',
        batchNo:       vals[5]?.trim() || '',
        batchSize:     vals[10]?.trim() || '',
      },
    }
  }
  return {
    label: 'Format 1 detected (7-col schedule)',
    patch: {
      diNumber:      vals[0]?.trim() || '',
      shift:         vals[1]?.trim() || '',
      batchIncharge: vals[2]?.trim() || '',
      reactor:       vals[3]?.trim() || '',
      product:       vals[4]?.trim() || '',
      batchNo:       vals[5]?.trim() || '',
      batchSize:     vals[6]?.trim() || '',
    },
  }
}

export default function SchedulePasteZone({ patch }) {
  const [pasteLabel, setPasteLabel] = useState('')
  const pasteRef = useRef(null)

  const handleSchedulePaste = (e) => {
    e.preventDefault()
    const text = e.clipboardData.getData('text')
    const { label, patch: p } = parseSchedulePaste(text)
    patch(p)
    setPasteLabel(`✓ ${label} — filled`)
    if (pasteRef.current) pasteRef.current.value = ''
  }

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl px-4 py-3.5">
      <p className="text-[12.5px] text-amber-900 font-semibold mb-1.5 flex items-center gap-1.5">
        <ClipboardPaste size={14} /> Paste from Schedule — click the box, then Ctrl+V. Format is auto-detected.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-amber-700 mb-2">
        <div className="bg-white/70 border border-amber-200 rounded-md px-2.5 py-1.5">
          <b>Format 1 (7 cols):</b> DI No → Shift → Batch Incharge → Reactor → Product → Batch No → Total Qty
        </div>
        <div className="bg-white/70 border border-amber-200 rounded-md px-2.5 py-1.5">
          <b>Format 2 (11 cols):</b> Incharge → DI No → Shift → Location → Product → Batch Code → Equipment → … → Total Qty
        </div>
      </div>
      <input ref={pasteRef} onPaste={handleSchedulePaste}
        placeholder="👆 Click here and paste your schedule row (Ctrl+V)"
        className="w-full border-2 border-dashed border-amber-400 bg-amber-50/60 rounded-lg px-3 py-2 text-[13px] text-amber-900 outline-none focus:bg-white transition-colors" />
      {pasteLabel && <p className="text-[11px] text-green-700 font-medium mt-1.5 flex items-center gap-1"><CheckCircle2 size={12} /> {pasteLabel}</p>}
    </div>
  )
}
