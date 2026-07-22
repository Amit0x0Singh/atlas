import { useState } from 'react'
import { BackButton, PageHeader } from '../../../../components/ui'
import { Repeat, ArrowDownToLine, ArrowUpFromLine, ClipboardList } from 'lucide-react'
import InwardTab from '../components/inward-tab/InwardTab.jsx'
import OutwardTab from '../components/outward-tab/OutwardTab.jsx'
import HistoryTab from '../components/history-tab/HistoryTab.jsx'

const TABS = [
  ['inward', 'Microbe Inward', ArrowDownToLine],
  ['outward', 'Outward / Issuance', ArrowUpFromLine],
  ['history', 'Transaction History', ClipboardList],
]

export default function MicrobeTransaction() {
  const [tab, setTab] = useState('inward')

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Repeat}
        title="Microbe Transaction"
        description="Record microbial SFG inward, issue stock (FEFO), and review the full transaction history"
        actions={<BackButton />}
      >
        <div className="flex gap-1">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-[13px] font-semibold border border-b-0 transition-colors ${
                tab === key
                  ? 'bg-white text-blue-700 border-gray-200'
                  : 'bg-gray-50 text-gray-500 border-gray-200 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="p-4 md:p-6">
        {tab === 'inward' && <InwardTab />}
        {tab === 'outward' && <OutwardTab />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
