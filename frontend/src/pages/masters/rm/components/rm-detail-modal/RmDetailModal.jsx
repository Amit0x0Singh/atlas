import { X, Package, Hash, Layers, Droplets, Beaker, Clock, ArrowLeftRight } from 'lucide-react'
import { Modal } from '../../../../../components/ui'

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
  : '—'

const TRACKING_BADGE = {
  PACK: 'bg-blue-50 text-blue-700 ring-blue-200',
  BULK: 'bg-green-50 text-green-700 ring-green-200',
}

const STATE_BADGE = {
  SOLID:  'bg-stone-50 text-stone-700 ring-stone-200',
  LIQUID: 'bg-sky-50 text-sky-700 ring-sky-200',
  GAS:    'bg-violet-50 text-violet-700 ring-violet-200',
}

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

export default function RmDetailModal({ item, onClose }) {
  if (!item) return null
  const trackingColor = TRACKING_BADGE[item.trackingType || 'PACK']
  const stateColor = STATE_BADGE[item.state] || 'bg-gray-100 text-gray-600 ring-gray-200'
  const density = item.density != null && item.density !== '' ? `${item.density} kg/L` : null

  return (
    <Modal open={!!item} onClose={onClose} size="md">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-5 bg-gradient-to-br from-blue-50/80 to-white">
        <div className="flex items-start gap-3 min-w-0">
          <div className="shrink-0 w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm shadow-blue-200">
            <Package size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-gray-900 truncate">{item.itemName}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-200 px-2 py-0.5 rounded-md">
                <Hash size={11} />{item.itemCode}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${trackingColor}`}>
                {item.trackingType || 'PACK'}
              </span>
              {item.state && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ring-1 ring-inset ${stateColor}`}>
                  {item.state}
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
          <StatCard icon={Beaker}        label="UOM"                value={item.uom} />
          <StatCard icon={ArrowLeftRight} label="Operation UOM"     value={item.operationUom} empty={!item.operationUom} />
          <StatCard icon={ArrowLeftRight} label="Conversion Required" value={item.conversionRequired ? 'Yes' : 'No'} />
          <StatCard icon={Droplets}      label="Density"            value={density} empty={density == null} />
          <StatCard icon={Layers}        label="Category"           value={item.category}    empty={!item.category} />
          <StatCard icon={Layers}        label="Sub Category"       value={item.subCategory} empty={!item.subCategory} />
        </div>
      </div>

      {/* Footer — timestamps */}
      <div className="flex items-center justify-between px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
        <span className="flex items-center gap-1.5"><Clock size={12} /> Created {fmtDateTime(item.createdAt)}</span>
        <span className="flex items-center gap-1.5"><Clock size={12} /> Updated {fmtDateTime(item.updatedAt)}</span>
      </div>
    </Modal>
  )
}
