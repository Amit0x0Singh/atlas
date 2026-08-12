import { Loader2, ClipboardList, FlaskConical, X } from 'lucide-react'
import { Button, IconButton, BottomSheet } from '../../../../../../../components/ui'
import { PLANT_BADGE, statusBadgeCls } from '../../../../../../production/planning/data/plantConfig.js'

import { toTitleCase } from '../../../../../../../utils/textDisplay.js'
export default function SelectStep({
  error, isMobile,
  selProduct, batchQty, batchUom, batchRef, diNo, selTaskId,
  taskFilter, setTaskFilter, filteredTasks, loadingTasks,
  loadingBom, onSelectTask, onLoadBom, onClearSelection,
}) {
  const taskDetailBody = (
    <>
      <dl className="space-y-2 text-sm mb-4">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-gray-400">Batch Qty</dt>
          <dd className="font-semibold text-gray-800">{batchQty || '—'} {batchUom?.toUpperCase()}</dd>
        </div>
        {batchRef && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-400">Batch Ref</dt>
            <dd className="font-mono text-xs text-gray-700 truncate max-w-[170px]">{batchRef}</dd>
          </div>
        )}
        {diNo && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-gray-400">DI No.</dt>
            <dd className="text-gray-700">{diNo}</dd>
          </div>
        )}
      </dl>

      <Button onClick={onLoadBom}
        disabled={loadingBom || !selProduct || !batchQty || parseFloat(batchQty) <= 0}
        loading={loadingBom}
        variant="purple"
        fullWidth>
        {loadingBom ? 'Loading BOM…' : 'Load BOM & Start Issuing'}
      </Button>
    </>
  )

  return (
    <div className="p-4 md:p-6 max-w-6xl">

      <p className="text-sm text-gray-500 mb-4">
        Select a production task to issue raw materials by BOM. Progress is auto-saved — you can leave and resume any time.
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">

        {/* ── Left: filters + task list ──────────────────────────────── */}
        <div>
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <select value={taskFilter.plant} onChange={e => setTaskFilter(f => ({ ...f, plant: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:ring-2 focus:ring-indigo-400">
              <option value="">All Plants</option>
              {['Nano', 'Botanical', 'Liquid', 'Powder', 'Granules'].map(p => <option key={p}>{p}</option>)}
            </select>
            <input type="date" value={taskFilter.date} onChange={e => setTaskFilter(f => ({ ...f, date: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400" />
            {!loadingTasks && (
              <span className="text-xs text-gray-400 ml-auto">{filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''}</span>
            )}
          </div>

          {/* Task list — the right-hand panel now owns the sticky action,
              so this list is free to scroll a taller viewport in place. */}
          {loadingTasks ? (
            <div className="py-14 text-center text-gray-400">
              <Loader2 size={22} className="animate-spin mx-auto mb-2" />
              Loading tasks…
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-10 text-center">
              <ClipboardList size={26} className="mx-auto mb-2 text-gray-300" />
              <p className="text-sm text-gray-500 font-medium">No active tasks for selected date / plant</p>
              <p className="text-xs text-gray-400 mt-1">Tasks must be sent from the Planning page first</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[68vh] overflow-y-auto pr-1 -mr-1">
              {filteredTasks.map(task => {
                // Compare by the task's own id, not productName+qty — multiple
                // cycles of the same batch (same product, same qty, different
                // batch code) would otherwise all match at once as soon as any
                // one of them was selected.
                const isSelected = selTaskId === task.id
                return (
                  <button key={task.id} type="button"
                    onClick={() => onSelectTask(task)}
                    className={`w-full text-left border rounded-xl px-4 py-3 transition hover:border-indigo-400 hover:bg-indigo-50/60 hover:shadow-sm ${
                      isSelected ? 'border-indigo-400 bg-indigo-50 shadow-sm ring-1 ring-indigo-200' : 'border-gray-200 bg-white'
                    }`}>
                    <div className="flex items-start gap-3">
                      <span className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${PLANT_BADGE[task.plant] || 'bg-gray-100 text-gray-600 border border-gray-200'}`}>
                        <FlaskConical size={16} />
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-semibold text-gray-900 text-sm truncate">{toTitleCase(task.productName)}</div>
                          <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-bold ${statusBadgeCls(task.status)}`}>{task.status}</span>
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-400">
                          {task.date && <span>{task.date}</span>}
                          <span className="font-medium text-gray-600">{task.qty} {task.qtyUom || 'KG'}</span>
                          {task.batchCode && <span className="font-mono">{task.batchCode}</span>}
                          {task.diNo      && <span>{task.diNo}</span>}
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${PLANT_BADGE[task.plant] || 'bg-gray-100 text-gray-600'}`}>{task.plant}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right: sticky selected-task detail panel (desktop/tablet only —
            on mobile the same content opens as a bottom-sheet popup below,
            since there's no room for a fixed side panel on a phone). ──── */}
        {!isMobile && (
          <aside className="xl:sticky xl:top-6 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            {selProduct ? (
              <div className="p-4">
                <div className="flex items-start gap-2.5 mb-4">
                  <span className="shrink-0 w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <FlaskConical size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-wide">Selected Task</p>
                    <p className="text-sm font-bold text-gray-900 truncate">{toTitleCase(selProduct.productName)}</p>
                  </div>
                  <IconButton icon={X} onClick={onClearSelection} variant="ghost" size="xs" tooltip="Clear selection" className="ml-auto flex-shrink-0" />
                </div>

                {taskDetailBody}
              </div>
            ) : (
              <div className="px-5 py-10 text-center">
                <ClipboardList size={26} className="mx-auto mb-2 text-gray-300" />
                <p className="text-sm text-gray-500 font-medium">No task selected</p>
                <p className="text-xs text-gray-400 mt-1">Pick a task from the list to see its details here</p>
              </div>
            )}
          </aside>
        )}

      </div>

      {/* ── Mobile: selected-task detail opens as a popup instead of an
          inline side panel — pops up automatically once a task is picked. */}
      {isMobile && (
        <BottomSheet open={!!selProduct} onClose={onClearSelection} title={toTitleCase(selProduct?.productName) || 'Selected Task'}>
          <div className="p-4">
            {taskDetailBody}
          </div>
        </BottomSheet>
      )}
    </div>
  )
}
