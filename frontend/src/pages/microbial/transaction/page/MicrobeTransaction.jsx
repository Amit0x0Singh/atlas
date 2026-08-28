import { useState } from 'react'
import { BackButton, Button, PageHeader } from '../../../../components/ui'
import { Can } from '../../../../components/common/Can.jsx'
import { Repeat, ArrowDown, ArrowUp, ArrowLeft, ClipboardList, Plus, Upload, MinusCircle, List } from 'lucide-react'
import InwardTab from '../components/inward-tab/InwardTab.jsx'
import OutwardTab from '../components/outward-tab/OutwardTab.jsx'
import HistoryTab from '../components/history-tab/HistoryTab.jsx'

// Stock Loss Adjustment is reached from inside the Outward tab (it's an
// outward-side correction), not a top-level tab of its own.
const TABS = [
  ['inward', 'Inward', ArrowDown],
  ['outward', 'Outward', ArrowUp],
]

export default function MicrobeTransaction() {
  const [tab, setTab] = useState('inward')
  const [showInwardForm, setShowInwardForm] = useState(false)
  const [showInwardImport, setShowInwardImport] = useState(false)
  // Stock Loss Adjustment lives inside the Outward tab: null = normal outward,
  // 'form' = record-a-loss wizard, 'records' = list of past adjustments.
  const [adjustView, setAdjustView] = useState(null)

  const selectTab = (key) => { setAdjustView(null); setTab(key) }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={Repeat}
        title="Microbe Transaction"
        description="Record microbial SFG inward, issue stock (FEFO), and review the full transaction history"
        actions={<>
          {tab === 'history' ? (
            <Button variant="outline-gray" size="md" icon={ArrowLeft} onClick={() => setTab('inward')}>
              Back to Transactions
            </Button>
          ) : (
            <>
              <Button variant="outline-gray" size="md" icon={ClipboardList} onClick={() => setTab('history')}>
                Transaction History
              </Button>
              <BackButton />
            </>
          )}
        </>}
      >
      </PageHeader>

      {tab !== 'history' && (
        <div className="flex items-center justify-between gap-3 flex-wrap px-4 md:px-6 py-3.5 md:py-4">
          <div className="inline-flex gap-1 bg-slate-200 p-1 rounded-[10px] w-fit">
            {TABS.map(([key, label, Icon]) => (
              <button
                key={key}
                onClick={() => selectTab(key)}
                className={`flex items-center gap-1.5 px-6 py-2 rounded-[7px] text-[13px] font-semibold transition-all ${
                  tab === key
                    ? 'bg-white text-slate-900 shadow-[0_1px_4px_rgba(0,0,0,0.1)]'
                    : 'bg-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {tab === 'inward' && (
            <div className="flex gap-3">
              <Can permission="microbial.sfg-inward.import">
                <Button variant="outline-gray" icon={Upload} onClick={() => setShowInwardImport(true)}>Import Excel</Button>
              </Can>
              <Can permission="microbial.sfg-inward.create">
                <Button variant="primary" icon={Plus} onClick={() => setShowInwardForm(true)}>New Inward Entry</Button>
              </Can>
            </div>
          )}

          {tab === 'outward' && (
            adjustView ? (
              <div className="flex gap-3">
                <Button variant="outline-gray" icon={ArrowLeft} onClick={() => setAdjustView(null)}>
                  Back to Outward
                </Button>
                {adjustView === 'form' ? (
                  <Button variant="outline-gray" icon={List} onClick={() => setAdjustView('records')}>
                    Adjustment Records
                  </Button>
                ) : (
                  <Can permission="microbial.sfg-adjustment.create">
                    <Button variant="primary" icon={MinusCircle} onClick={() => setAdjustView('form')}>
                      Record Stock Loss
                    </Button>
                  </Can>
                )}
              </div>
            ) : (
              <Can anyOf={['microbial.sfg-adjustment.view', 'microbial.sfg-adjustment.create']}>
                <Button variant="outline-gray" icon={MinusCircle} onClick={() => setAdjustView('form')}>
                  Stock Loss Adjustment
                </Button>
              </Can>
            )
          )}
        </div>
      )}

      <div className="p-4 md:p-6">
        {tab === 'inward' && (
          <InwardTab
            showForm={showInwardForm} setShowForm={setShowInwardForm}
            showImport={showInwardImport} setShowImport={setShowInwardImport}
          />
        )}
        {tab === 'outward' && <OutwardTab adjustView={adjustView} />}
        {tab === 'history' && <HistoryTab />}
      </div>
    </div>
  )
}
