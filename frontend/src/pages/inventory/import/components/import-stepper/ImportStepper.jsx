import { Check } from 'lucide-react'

// Maps to what the backend actually does in two calls — preview (structural
// sheet/column detection) then execute (the real write + row-level results).
// There's no separate dry-run "validate all rows" endpoint, so this is 3
// honest stages rather than a 4-stage Upload/Validate/Review/Import pipeline
// that would imply data (like a pre-import valid/invalid row count) the
// backend doesn't produce until after the import actually runs.
const STEPS = [
  { key: 'upload',  label: 'Upload' },
  { key: 'analyze', label: 'Analyze' },
  { key: 'import',  label: 'Import' },
]

export default function ImportStepper({ current }) {
  // 'done' (all steps finished, e.g. import completed) maps past the last
  // index so every step renders as checked instead of one being "active".
  const currentIndex = current === 'done' ? STEPS.length : STEPS.findIndex(s => s.key === current)

  return (
    <ol className="flex items-center gap-1.5 mb-6" aria-label="Import progress">
      {STEPS.map((step, i) => {
        const done = i < currentIndex
        const active = i === currentIndex
        return (
          <li key={step.key} className="flex items-center gap-1.5">
            <div
              aria-current={active ? 'step' : undefined}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
                done   ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200' :
                active ? 'bg-blue-600 text-white' :
                         'bg-gray-100 text-gray-400'
              }`}
            >
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                done ? 'bg-green-600 text-white' : active ? 'bg-white/20' : 'bg-gray-200'
              }`}>
                {done ? <Check size={10} strokeWidth={3} /> : i + 1}
              </span>
              {step.label}
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-5 h-px ${i < currentIndex ? 'bg-green-300' : 'bg-gray-200'}`} aria-hidden="true" />
            )}
          </li>
        )
      })}
    </ol>
  )
}
