import { containerApi } from '../../../../../api/inventory.js'
import { useContainers } from '../hooks/useContainers.js'

function fillPct(c) {
  if (!c.capacity) return 0
  return Math.min(100, Math.round((c.currentQty / c.capacity) * 100))
}

function barColor(pct) {
  if (pct >= 75) return 'bg-green-500'
  if (pct >= 30) return 'bg-yellow-400'
  return 'bg-red-400'
}

export default function ContainerList({ onSelect }) {
  const { containers, loading, error, reload } = useContainers()

  if (loading) return <p className="text-gray-400 text-sm p-6">Loading containers…</p>
  if (error)   return <p className="text-red-500 text-sm p-6">{error}</p>

  if (containers.length === 0) return (
    <div className="p-6">
      <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-5 py-5 rounded-xl text-sm">
        No containers found. Create your first container using the <strong>Create Container</strong> tab.
      </div>
    </div>
  )

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{containers.length} container{containers.length !== 1 ? 's' : ''}</p>
        <button onClick={reload} className="text-sm border border-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-50">
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {containers.map(c => {
          const pct = fillPct(c)
          return (
            <div key={c.containerId}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">

              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-bold text-gray-900 text-sm font-mono">{c.containerId}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{c.itemName}</div>
                  <div className="text-xs text-gray-400 font-mono">{c.itemCode}</div>
                </div>
                <a
                  href={containerApi.labelUrl(c.containerId)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs bg-orange-50 border border-orange-200 text-orange-700 px-2 py-1 rounded hover:bg-orange-100"
                  title="Print QR label"
                >
                  QR Label
                </a>
              </div>

              {/* Fill bar */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{c.currentQty.toFixed(2)} {c.uom}</span>
                  <span>{pct}% full</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor(pct)}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="text-right text-xs text-gray-400 mt-0.5">
                  Cap: {c.capacity} {c.uom}
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onSelect(c, 'fill')}
                  className="flex-1 bg-blue-600 text-white text-xs py-2 rounded-lg hover:bg-blue-700 font-semibold"
                >
                  Fill
                </button>
                <button
                  onClick={() => onSelect(c, 'issue')}
                  disabled={c.currentQty <= 0}
                  className="flex-1 bg-green-600 text-white text-xs py-2 rounded-lg hover:bg-green-700 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Issue
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
