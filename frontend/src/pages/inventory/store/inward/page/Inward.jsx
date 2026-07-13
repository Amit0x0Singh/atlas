import { useState } from 'react'
import PackInward from '../components/pack-inward/PackInward.jsx'
import InwardHistory from '../components/inward-history/InwardHistory.jsx'
import { BackButton, PageHeader } from '../../../../../components/ui'
import { ArrowDownToLine, Package, ClipboardList } from 'lucide-react'
import './Inward.css'

const TABS = [
  { label: 'Pack Inward',    icon: Package },
  { label: 'Inward History', icon: ClipboardList },
]

export default function Inward() {
  const [tab, setTab] = useState(0)

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={ArrowDownToLine}
        title="Inward — Receive Stock"
        description="Pack Inward: scan individual QR-labelled bags · History: view all inwarded stock"
        actions={<span className="hidden md:block"><BackButton /></span>}
      >
        <div className="flex gap-0 border-b border-gray-200 overflow-x-auto -mx-4 md:-mx-6 px-4 md:px-6">
          {TABS.map((t, i) => {
            const Icon = t.icon
            return (
              <button key={i} onClick={() => setTab(i)}
                className={`flex items-center gap-1.5 px-3 md:px-5 py-2.5 text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap ${tab === i ? 'border-blue-600 text-blue-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <Icon size={14.5} />
                {t.label}
              </button>
            )
          })}
        </div>
      </PageHeader>
      <div className="flex-1 overflow-y-auto">
        {tab === 0 ? <PackInward /> : <InwardHistory />}
      </div>
    </div>
  )
}
