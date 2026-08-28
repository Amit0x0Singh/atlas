import { useState } from 'react'
import { ChevronRight, Package } from 'lucide-react'
import { Loading } from '../../../../components/ui'
import { useOptionGroups } from '../../../../hooks/useOptionsAdmin.js'
import OptionGroupDetail from './OptionGroupDetail.jsx'
import PackingItemsSection from '../packing-items/PackingItemsSection.jsx'

// Sentinel key for the one non-OptionGroup entry in this list — the Packing
// Item master (its own table, richer shape: name + code + type), surfaced
// here so it's managed alongside the plain dropdown option groups.
const PACKING_ITEMS = '__PACKING_ITEMS__'

export default function OptionGroupsList() {
  const { data: groups = [], isLoading } = useOptionGroups()
  const [selected, setSelected] = useState(null)

  if (selected === PACKING_ITEMS) return <PackingItemsSection onBack={() => setSelected(null)} />
  if (selected) return <OptionGroupDetail groupCode={selected} onBack={() => setSelected(null)} />

  if (isLoading) return <Loading />

  return (
    <div className="max-w-3xl">
      <p className="text-xs text-gray-500 mb-3">
        Manage the options offered in dropdowns across the app. Deactivating an option removes it from new records — existing records that already use it are unaffected.
      </p>
      <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
        {groups.map((g) => (
          <button
            key={g.groupCode}
            type="button"
            onClick={() => setSelected(g.groupCode)}
            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-gray-900">{g.label}</div>
              {g.description && <div className="text-xs text-gray-500 truncate">{g.description}</div>}
            </div>
            <span className="text-xs font-semibold text-gray-400 shrink-0">{g._count.values} options</span>
            <ChevronRight size={16} className="text-gray-300 shrink-0" />
          </button>
        ))}

        <button
          type="button"
          onClick={() => setSelected(PACKING_ITEMS)}
          className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
              <Package size={13} className="text-gray-400" /> Packing Items
            </div>
            <div className="text-xs text-gray-500 truncate">Sales Order Primary / Secondary Pack suggestions (name + item code + type)</div>
          </div>
          <ChevronRight size={16} className="text-gray-300 shrink-0" />
        </button>
      </div>
    </div>
  )
}
