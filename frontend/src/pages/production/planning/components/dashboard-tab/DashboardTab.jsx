import { PLANT_CONFIG, PLANT_KEYS } from '../../data/plantConfig.js'
import { todayISO } from '../../utils/date.js'
import { Button } from '../../../../../components/ui'
import StatusBadge from '../ui/status-badge/StatusBadge.jsx'
import PlantBadge from '../ui/plant-badge/PlantBadge.jsx'

export default function DashboardTab({ tasks, onStatusUpdate }) {
  const today = todayISO()
  const todayTasks = tasks.filter(t => t.date === today && t.sent && t.status !== 'Completed')

  return (
    <div className="p-6">
      <div className="grid grid-cols-5 gap-3.5 mb-6">
        {PLANT_KEYS.map(plant => {
          const cfg   = PLANT_CONFIG[plant]
          const count = todayTasks.filter(t => t.plant === plant).length
          return (
            <div key={plant} className="bg-white rounded-xl p-4 shadow-sm" style={{ borderTop: `4px solid ${cfg.color}` }}>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{plant}</div>
              <div className="text-[22px] font-bold text-gray-900">{count}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">active tasks today</div>
            </div>
          )
        })}
      </div>

      {todayTasks.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <div className="text-4xl mb-3">📅</div>
          <div className="font-semibold text-gray-500">No active tasks for today</div>
          <div className="text-[12px] mt-1">Go to Planning tab → create tasks → Send Schedule</div>
        </div>
      ) : (
        <div className="pp-task-grid grid gap-3.5">
          {todayTasks.map(t => (
            <div key={t.id} className="bg-white rounded-xl shadow-sm overflow-hidden"
              style={{ borderLeft: `5px solid ${PLANT_CONFIG[t.plant]?.color || '#64748b'}` }}>
              <div className="px-4 py-3 flex items-start justify-between">
                <div>
                  <div className="font-mono text-[11px] text-gray-400 mb-0.5">{t.taskId}</div>
                  <div className="font-bold text-[14px]">{t.productName}</div>
                </div>
                <StatusBadge status={t.status || 'Not Started'} />
              </div>
              <div className="px-4 pb-3 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11.5px] text-gray-500">
                <span>Plant: <b className="text-gray-800">{t.plant}</b></span>
                <span>Qty: <b className="text-gray-800">{t.qty} {t.qtyUom || ''}</b></span>
                <span>Process: <b className="text-gray-800">{t.process}</b></span>
                <span>Incharge: <b className="text-gray-800">{t.incharge}</b></span>
              </div>
              <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
                <PlantBadge plant={t.plant} />
                <Button variant="primary" size="xs" onClick={() => onStatusUpdate(t)}>
                  Update Status
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
