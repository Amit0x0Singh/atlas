import { useState, useEffect, useCallback } from 'react'
// Task scheduling data/utils/drawers are shared with Planning (production/planning) —
// kept there rather than duplicated, since both pages operate on the same task data.
import { TAB_TO_PLANT } from '../../planning/data/plantConfig.js'
import { todayISO } from '../../planning/utils/date.js'
import AddTaskDrawer from '../../planning/components/add-task-drawer/page/AddTaskDrawer.jsx'
import StatusDrawer from '../../planning/components/status-drawer/StatusDrawer.jsx'
import SFGStockModal from '../../planning/components/sfg-stock-modal/SFGStockModal.jsx'
import Toast from '../../planning/components/ui/toast/Toast.jsx'
import BMROverlay from '../components/bmr-overlay/page/BMROverlay.jsx'
import PlantTab from '../components/plant-tab/PlantTab.jsx'
import HistoryTab from '../components/history-tab/HistoryTab.jsx'
import { Button, PageHeader } from '../../../../components/ui'
import { Factory, ClipboardList } from 'lucide-react'
import { planTasksApi } from '../../../../api/production.js'
import './ProductionPage.css'

function useToast() {
  const [toast, setToast] = useState(null)
  function show(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

const TABS = [
  { id: 'nano',      label: 'Nano Plant',     dot: '#1a4a6b' },
  { id: 'botanical', label: 'Botanical',      dot: '#2d5e18' },
  { id: 'liquid',    label: 'Liquid Filling', dot: '#7c3aed' },
  { id: 'powder',    label: 'Powder',         dot: '#92400e' },
  { id: 'granules',  label: 'Granules',       dot: '#0f766e' },
  { id: 'history',   label: 'History',        icon: ClipboardList },
]

export default function ProductionPage() {
  const [activeTab,    setActiveTab]    = useState('nano')
  const [tasks,        setTasks]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [drawer,       setDrawer]       = useState(null)
  const [statusTarget, setStatusTarget] = useState(null)
  const [bmrTasks,     setBmrTasks]     = useState([])   // array of full task objects
  const [sfgOpen,      setSfgOpen]      = useState(false)
  const { toast, show: toastShow } = useToast()

  const loadTasks = useCallback(async () => {
    setLoading(true)
    try {
      const r = await planTasksApi.list()
      setTasks(r.data || [])
    } catch (e) {
      toastShow('Failed to load tasks: ' + e.message, 'err')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadTasks() }, [])

  function openBMR(task) {
    setBmrTasks(prev => prev.find(t => t.id === task.id) ? prev : [...prev, task])
  }

  const today = todayISO()
  const activeTodayCount = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed').length

  return (
    <div className="prodp-root flex flex-col overflow-hidden bg-[#f0f4f8]">
      <PageHeader
        icon={Factory}
        title="Production"
        description="Live plant task boards — track, update, and complete scheduled batches"
        actions={<>
          {activeTodayCount > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">{activeTodayCount} active today</span>
          )}
          {loading && <span className="text-xs text-gray-400">Loading…</span>}
          <span className="hidden md:inline text-xs text-gray-400 whitespace-nowrap">
            {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
          </span>
          <Button variant="outline-gray" size="sm" onClick={() => setSfgOpen(true)}>SFG Stock</Button>
        </>}
      />

      {/* Tabs */}
      <div className="bg-white border-b-2 border-gray-200 flex px-6 overflow-x-auto flex-shrink-0">
        {TABS.map(tab => {
          const Icon = tab.icon
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-5 py-3.5 text-[13px] font-semibold border-b-[3px] -mb-0.5 whitespace-nowrap transition
                ${activeTab === tab.id ? 'text-blue-600 border-blue-600' : 'text-gray-400 border-transparent hover:text-gray-700'}`}>
              {tab.dot && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: tab.dot }} />}
              {Icon && <Icon size={14.5} />}
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {['nano', 'botanical', 'liquid', 'powder', 'granules'].includes(activeTab) && (
          <PlantTab
            plant={TAB_TO_PLANT[activeTab]}
            tasks={tasks}
            onEdit={t => setDrawer({ task: t })}
            onStatusUpdate={t => setStatusTarget(t)}
            onBMR={openBMR}
          />
        )}
        {activeTab === 'history' && <HistoryTab tasks={tasks} />}
      </div>

      {drawer && (
        <AddTaskDrawer
          task={drawer.task}
          defaultDate={todayISO()}
          onSave={() => toastShow('Task updated', 'ok')}
          onClose={() => { setDrawer(null); loadTasks() }}
        />
      )}

      {statusTarget && (
        <StatusDrawer
          task={statusTarget}
          onSave={() => { loadTasks(); toastShow('Status updated', 'ok') }}
          onClose={() => setStatusTarget(null)}
        />
      )}

      {bmrTasks.length > 0 && (
        <BMROverlay
          openTasks={bmrTasks}
          onClose={() => { setBmrTasks([]); loadTasks() }}
          onTasksChange={tasks => { setBmrTasks(tasks); loadTasks() }}
        />
      )}

      {sfgOpen && <SFGStockModal onClose={() => setSfgOpen(false)} />}

      <Toast toast={toast} />
    </div>
  )
}
