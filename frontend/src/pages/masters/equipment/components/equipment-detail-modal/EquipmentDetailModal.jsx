import { X, Wrench, Gauge, Settings2, MapPin, Package, Clock, Hash } from 'lucide-react'
import { Modal } from '../../../../../components/ui'
import { toTitleCase } from '../../../../../utils/textDisplay.js'
import { useUserDisplayNames } from '../../../../../hooks/masters/useUserDisplayNames.js'

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  : '—'

// Same six plants used across the app — a stable color per plant makes the
// badge scannable at a glance instead of just more gray text.
const PLANT_COLORS = {
  POWDER:    'bg-amber-50 text-amber-700 ring-amber-200',
  GRANULES:  'bg-orange-50 text-orange-700 ring-orange-200',
  LIQUID:    'bg-sky-50 text-sky-700 ring-sky-200',
  BOTANICAL: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  MICROBIAL: 'bg-violet-50 text-violet-700 ring-violet-200',
  NANO:      'bg-pink-50 text-pink-700 ring-pink-200',
}
const DEFAULT_PLANT_COLOR = 'bg-gray-100 text-gray-600 ring-gray-200'

function StatCard({ icon: Icon, label, value, empty }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3">
      <div className="flex items-center gap-1.5 text-gray-400 mb-1">
        <Icon size={13} strokeWidth={2.25} />
        <span className="text-[11px] font-semibold uppercase tracking-wide">{label}</span>
      </div>
      {empty ? (
        <p className="text-sm text-gray-300 italic">Not set</p>
      ) : (
        <p className="text-sm font-semibold text-gray-800 truncate">{value}</p>
      )}
    </div>
  )
}

export default function EquipmentDetailModal({ item, onClose }) {
  const displayName = useUserDisplayNames()
  if (!item) return null
  const volume = `${item.workingVolume ?? 0}${item.workingUnit ? ` ${item.workingUnit.toUpperCase()}` : ''}`
  const plantColor = PLANT_COLORS[item.plant] || DEFAULT_PLANT_COLOR

  return (
    <Modal open={!!item} onClose={onClose} size="md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 bg-gradient-to-br from-blue-50/80 to-white">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
            <Wrench size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{toTitleCase(item.equipName)}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200 px-2 py-0.5 rounded-md">
                <Hash size={11} />{item.equipCode}
              </span>
              {item.plant && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${plantColor}`}>
                  {item.plant}
                </span>
              )}
            </div>
          </div>
        </div>
        <button onClick={onClose} className="shrink-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg p-1.5 transition-colors">
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={Gauge}    label="Working Volume"     value={volume} />
          <StatCard icon={Settings2} label="Operation"          value={item.operation}         empty={!item.operation} />
          <StatCard icon={MapPin}   label="Plant"               value={item.plant}             empty={!item.plant} />
          <StatCard icon={Package}  label="Designated Product"  value={item.designatedProduct} empty={!item.designatedProduct} />
        </div>
      </div>

      {/* Footer — who/when */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><Clock size={12} /> Created by {displayName(item.createdBy)} · {fmtDateTime(item.createdAt)}</span>
        <span className="flex items-center gap-1.5"><Clock size={12} /> Updated by {displayName(item.updatedBy)} · {fmtDateTime(item.updatedAt)}</span>
      </div>
    </Modal>
  )
}
