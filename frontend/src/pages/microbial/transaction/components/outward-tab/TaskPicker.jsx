import { Loader2, ClipboardList, FlaskConical } from 'lucide-react'
import { PLANT_BADGE, statusBadgeCls } from '../../../../production/planning/data/plantConfig.js'

// Mirrors Material Issue by BOM's task picker (same production_tasks pool,
// same "sent && not yet started" filter) — microbes are issued strictly
// against a planned batch's recipe, same as Store issues raw materials
// against it, never typed in from scratch.
export default function TaskPicker({ tasks, loadingTasks, taskFilter, setTaskFilter, onSelectTask, checking }) {
  const filteredTasks = tasks.filter((t) =>
    t.sent && t.status !== 'Completed' && !t.microbeIssueStarted &&
    (!taskFilter.plant || t.plant === taskFilter.plant) &&
    (!taskFilter.date || t.date === taskFilter.date)
  )

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-base font-bold text-gray-900 mb-1">Select Production Task</h3>
      <p className="text-xs text-gray-500 mb-4">
        Microbes are issued against a planned batch's recipe — pick the task the planner sent, and its product, batch, DI number, and microbe requirements are pulled in automatically.
      </p>

      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <select value={taskFilter.plant} onChange={(e) => setTaskFilter((f) => ({ ...f, plant: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">All Plants</option>
          {['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules'].map((p) => <option key={p}>{p}</option>)}
        </select>
        <input type="date" value={taskFilter.date} onChange={(e) => setTaskFilter((f) => ({ ...f, date: e.target.value }))}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
        {!loadingTasks && <span className="text-xs text-gray-400 ml-auto">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>}
      </div>

      {loadingTasks ? (
        <div className="py-10 text-center text-gray-400">
          <Loader2 size={20} className="animate-spin mx-auto mb-2" />
          Loading tasks…
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-8 text-center">
          <ClipboardList size={24} className="mx-auto mb-2 text-gray-300" />
          <p className="text-sm text-gray-500 font-medium">No active tasks for selected date / plant</p>
          <p className="text-xs text-gray-400 mt-1">Tasks must be sent from the Planning page first.</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto pr-1 -mr-1">
          {filteredTasks.map((task) => (
            <button key={task.id} type="button" onClick={() => onSelectTask(task)} disabled={checking}
              className="w-full text-left border border-gray-200 rounded-xl px-4 py-3 transition hover:border-blue-400 hover:bg-blue-50/60 disabled:opacity-50">
              <div className="flex items-start gap-3">
                <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${PLANT_BADGE[task.plant] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                  <FlaskConical size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-semibold text-gray-900 text-sm truncate">{task.productName}</div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadgeCls(task.status)}`}>{task.status}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                    {task.date && <span>{task.date}</span>}
                    <span className="font-medium text-gray-600">{task.qty} {task.qtyUom || 'KG'}</span>
                    {task.batchCode && <span className="font-mono">{task.batchCode}</span>}
                    {task.diNo && <span>{task.diNo}</span>}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PLANT_BADGE[task.plant] || 'bg-gray-100 text-gray-600'}`}>{task.plant}</span>
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
