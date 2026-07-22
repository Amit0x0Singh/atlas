import { useState, useEffect, useCallback } from 'react'
import { todayISO } from '../utils/date.js'
import AddTaskDrawer from '../components/add-task-drawer/page/AddTaskDrawer.jsx'
import StatusDrawer from '../components/status-drawer/StatusDrawer.jsx'
import SFGStockModal from '../components/sfg-stock-modal/SFGStockModal.jsx'
import Toast from '../components/ui/toast/Toast.jsx'
import BomIssuance from '../components/bom-issuance/BomIssuance.jsx'
import DashboardTab from '../components/dashboard-tab/DashboardTab.jsx'
import PlanningTab from '../components/planning-tab/PlanningTab.jsx'
import { Button, PageHeader } from '../../../../components/ui'
import { CalendarClock, LayoutDashboard, CalendarDays, FileText } from 'lucide-react'
import { planTasksApi } from '../../../../api/production.js'
import './PlanningPage.css'

function useToast() {
  const [toast, setToast] = useState(null)
  function show(msg, type = 'ok') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }
  return { toast, show }
}

const TABS = [
  { id: 'dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'planning',     label: 'Planning',     icon: CalendarDays },
  { id: 'bom-issuance', label: 'BOM Issuance', icon: FileText },
]

export default function PlanningPage() {
  const [activeTab,    setActiveTab]    = useState('dashboard')
  const [tasks,        setTasks]        = useState([])
  const [loading,      setLoading]      = useState(false)
  const [drawer,       setDrawer]       = useState(null)   // null | { defaultDate? } | { task }
  const [statusTarget, setStatusTarget] = useState(null)
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

  async function deleteTask(t) {
    if (!confirm('Delete this task?')) return
    try {
      await planTasksApi.delete(t.id)
      loadTasks()
      toastShow('Task deleted', 'ok')
    } catch (e) {
      toastShow(e.message, 'err')
    }
  }

  const today = todayISO()
  const activeTodayCount = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed').length

  return (
    <div className="pp-root flex flex-col overflow-hidden bg-[#f0f4f8]">
      <PageHeader
        icon={CalendarClock}
        title="Production Planning"
        description="Schedule batches, send them to plants, and issue BOMs"
        actions={<>
          {activeTodayCount > 0 && (
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full whitespace-nowrap">{activeTodayCount} active today</span>
          )}
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
              {Icon && <Icon size={14.5} />}
              {tab.label}
            </button>
          )
        })}
        {loading && <span className="ml-auto self-center text-[11px] text-gray-400 pr-4">Loading…</span>}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'dashboard' && (
          <div className="flex-1 overflow-y-auto">
            <DashboardTab tasks={tasks} onStatusUpdate={t => setStatusTarget(t)} />
          </div>
        )}
        {activeTab === 'planning' && (
          <div className="flex-1 overflow-y-auto">
            <PlanningTab
              tasks={tasks}
              onRefresh={loadTasks}
              onAdd={(defaultDate) => setDrawer({ defaultDate })}
              onEdit={t => setDrawer({ task: t })}
              onDelete={deleteTask}
              toastShow={toastShow}
            />
          </div>
        )}
        {activeTab === 'bom-issuance' && (
          <BomIssuance />
        )}
      </div>

      {drawer && (
        <AddTaskDrawer
          task={drawer.task || null}
          defaultDate={drawer.defaultDate || todayISO()}
          onSave={() => toastShow(drawer.task ? 'Task updated' : 'Task added', 'ok')}
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

      {sfgOpen && <SFGStockModal onClose={() => setSfgOpen(false)} />}

      <Toast toast={toast} />
    </div>
  )
}
