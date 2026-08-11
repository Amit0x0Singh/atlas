import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Loading } from '../../../../components/ui'
import { useOptionGroups } from '../../../../hooks/useOptionsAdmin.js'
import OptionGroupDetail from './OptionGroupDetail.jsx'

export default function OptionGroupsList() {
  const { data: groups = [], isLoading } = useOptionGroups()
  const [selected, setSelected] = useState(null)

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
      </div>
    </div>
  )
}
