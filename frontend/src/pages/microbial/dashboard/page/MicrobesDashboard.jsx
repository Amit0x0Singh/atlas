import { useState } from 'react'
import { LayoutDashboard, Warehouse, ClipboardList } from 'lucide-react'
import { BackButton, PageHeader } from '../../../../components/ui'
import DashboardSection from '../components/dashboard-section/DashboardSection.jsx'
import StorageSection from '../components/storage-section/StorageSection.jsx'
import StockSummarySection from '../components/stock-summary-section/StockSummarySection.jsx'

const SECTIONS = [
  ['dashboard', 'Dashboard', LayoutDashboard],
  ['storage', 'Storage', Warehouse],
  ['stock-summary', 'Stock Summary', ClipboardList],
]

export default function MicrobesDashboard() {
  const [section, setSection] = useState('dashboard')
  // Bumped every time the "Stock Summary" tab is clicked, so re-clicking it
  // while already on that tab remounts StockSummarySection back to its
  // default microbe-wise view — the tab bar doubles as the way back out of
  // the drilled-down Container Ledger page.
  const [stockSummaryResetKey, setStockSummaryResetKey] = useState(0)

  const goToSection = (key) => {
    setSection(key)
    if (key === 'stock-summary') setStockSummaryResetKey((k) => k + 1)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={LayoutDashboard}
        title="Microbes Dashboard"
        description="Live overview of microbial SFG stock, storage, and issuance activity"
        actions={<BackButton />}
      >
        <div className="flex gap-1">
          {SECTIONS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => goToSection(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-t-lg text-[13px] font-semibold border border-b-0 transition-colors ${
                section === key
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
        {section === 'dashboard' && <DashboardSection onGoToSection={goToSection} />}
        {section === 'storage' && <StorageSection />}
        {section === 'stock-summary' && <StockSummarySection key={stockSummaryResetKey} />}
      </div>
    </div>
  )
}
