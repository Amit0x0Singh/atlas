import './StoreSection.css'
import { fmt } from '../utils.js'
import { SLabel } from '../shared/shared.jsx'

const STAGES = (st) => [
  { key: 'packsGenerated',      label: 'Generated',       value: st.packsGenerated },
  { key: 'packsAwaiting',       label: 'Awaiting Inward', value: st.packsAwaiting },
  { key: 'packsInwarded',       label: 'Inwarded',        value: st.packsInwarded },
  { key: 'outwardTransactions', label: 'Outward Txns',    value: st.outwardTransactions },
  { key: 'totalQtyIssued',      label: 'Qty Issued (kg)', value: fmt(st.totalQtyIssued, 1) },
]

export default function StoreSection({ st, loading, label }) {
  const stages = STAGES(st)

  return (
    <div>
      <SLabel>Store · Pack Pipeline · {label}</SLabel>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {stages.map((s, i) => (
            <div key={s.key} className="flex items-center flex-1 min-w-0">
              <div className={`flex-1 rounded-lg px-3 py-3 text-center min-w-0 ss-tile--${s.key}`}>
                {loading
                  ? <div className="h-5 w-8 bg-white bg-opacity-60 rounded mx-auto animate-pulse mb-1" />
                  : <div className={`text-xl font-bold leading-none mb-1 ss-value--${s.key}`}>
                      {s.value ?? '—'}
                    </div>
                }
                <div className="text-[10px] text-gray-500 leading-tight font-medium">{s.label}</div>
              </div>
              {i < stages.length - 1 && (
                <div className="flex-shrink-0 text-gray-300 text-base px-0.5">›</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
