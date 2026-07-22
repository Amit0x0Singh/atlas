import { useState, useEffect, useRef } from 'react'
// Shared with Planning (production/planning) — kept there, not duplicated.
import { sfgAddEntry } from '../../../../planning/utils/storage.js'
import { planTasksApi } from '../../../../../../api/production.js'
import NanoBMR from '../components/NanoBMR.jsx'
import PowderBMR from '../components/PowderBMR.jsx'
import QCHandoffModal from '../components/QCHandoffModal.jsx'
import { bmrLoad, bmrSave } from '../utils/bmrDrafts.js'
import './BMROverlay.css'

const PLANT_COLOR = {
  Nano: '#1a4a6b', Botanical: '#2d5e18', Liquid: '#7c3aed', Powder: '#92400e', Granules: '#0f766e',
}

// ── Main BMR Overlay ──────────────────────────────────────────────────────────
// openTasks: array of full task objects
export default function BMROverlay({ openTasks, onClose, onTasksChange }) {
  const [activeId,    setActiveId]    = useState(openTasks[0]?.id || null)
  const [saveStatus,  setSaveStatus]  = useState('All changes auto-saved')
  const [qcHandoff,   setQcHandoff]   = useState(null)
  const panelRef  = useRef(null)
  const debTimer  = useRef(null)

  const openEntries = openTasks.map(t => ({ taskId: t.id, task: t }))

  useEffect(() => {
    if (!activeId && openEntries.length) setActiveId(openEntries[0].taskId)
  }, [openTasks])

  function saveCurrentDraft() {
    if (!activeId || !panelRef.current) return
    const data = {}
    panelRef.current.querySelectorAll('[data-bmr-field]').forEach(el => {
      data[el.dataset.bmrField] = el.type === 'checkbox' ? el.checked : el.value
    })
    const drafts = bmrLoad()
    drafts[activeId] = data
    bmrSave(drafts)
  }

  function showSaved() {
    setSaveStatus('✓ Draft saved')
    clearTimeout(debTimer.current)
    debTimer.current = setTimeout(() => setSaveStatus('All changes auto-saved'), 2000)
  }

  function handleCloseTask(id) {
    saveCurrentDraft()
    const remaining = openTasks.filter(t => t.id !== id)
    if (!remaining.length) { onClose(); return }
    onTasksChange(remaining)
    if (activeId === id) setActiveId(remaining[remaining.length - 1]?.id || null)
  }

  async function handleSubmit(taskId) {
    saveCurrentDraft()
    if (!confirm('Submit BMR? This will mark the task as Completed.')) return
    const task    = openTasks.find(t => t.id === taskId)
    if (!task) return
    const bmrData = bmrLoad()[taskId] || {}

    let sfgCreated = null
    if (task.process === 'Formulation' && task.packAfter === 'NO') {
      const qty = parseFloat(bmrData['weight-after-sieve']) || parseFloat(bmrData['weight-after-unload']) || task.qty
      const loc = prompt(
        `Formulation complete — no packing scheduled.\nEnter SFG storage location:\n(${task.productName} | ${task.batchCode} | ${qty} ${task.qtyUom||'kg'})`,
        task.location || ''
      )
      if (loc === null) { alert('SFG location required. BMR not submitted.'); return }
      sfgAddEntry({ productName:task.productName, batchCode:task.batchCode, plant:task.plant, qty, qtyUom:task.qtyUom||'kg', location:loc.trim()||'—', sourceTaskId:task.id })
      sfgCreated = { qty, location: loc.trim() || '—' }
    }

    if (task.process === 'Packing' && task.sfgSourceId) {
      const sfgList = (() => { try { return JSON.parse(localStorage.getItem('erp_sfg_stock'))||[] } catch { return [] } })()
      const si = sfgList.findIndex(s => s.id === task.sfgSourceId)
      if (si >= 0) {
        const used = parseFloat(bmrData['packing-recv-qty']) || parseFloat(task.qty) || 0
        sfgList[si].qtyRemaining = Math.max(0, sfgList[si].qtyRemaining - used)
        sfgList[si].status = sfgList[si].qtyRemaining <= 0 ? 'Consumed' : 'Partially Used'
        localStorage.setItem('erp_sfg_stock', JSON.stringify(sfgList))
      }
    }

    try {
      await planTasksApi.update(taskId, {
        bmrSubmitted:   true,
        bmrSubmittedAt: new Date().toISOString(),
        status:         'Completed',
      })
    } catch (e) {
      alert('Failed to submit BMR: ' + e.message)
      return
    }

    setQcHandoff({ task, bmrData, sfgCreated })
    const remaining = openTasks.filter(t => t.id !== taskId)
    onTasksChange(remaining)
    if (!remaining.length || activeId === taskId) setActiveId(remaining[0]?.id || null)
  }

  function handleQcClose() {
    setQcHandoff(null)
    if (!openTasks.filter(t => t.id !== qcHandoff?.task?.id).length) onClose()
  }

  const entry     = openEntries.find(e => e.taskId === activeId)
  const task      = entry?.task
  const comps     = (() => {
    try {
      const recipes = JSON.parse(localStorage.getItem('sp3_recipes')||'[]')
      const r = recipes.find(r => r.name?.toLowerCase() === task?.productName?.toLowerCase())
      return r ? (r.components||[]).filter(c => c?.component) : []
    } catch { return [] }
  })()
  const isNanoBot = task && (task.plant === 'Nano' || task.plant === 'Botanical')

  return (
    <>
      <div className="fixed inset-0 z-[300] flex flex-col justify-end bo-overlay">
        {/* Task tabs bar */}
        <div className="bg-[#1e293b] flex items-center overflow-x-auto flex-shrink-0 border-t-2 border-[#334155] bo-tabs-bar">
          <div className="text-[11px] font-bold text-[#94a3b8] px-3 whitespace-nowrap tracking-wider">📋 OPEN BMRs</div>
          <div className="flex flex-1 overflow-x-auto">
            {openEntries.map(e => {
              const isAct = e.taskId === activeId
              return (
                <div key={e.taskId}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[12px] font-semibold cursor-pointer border-r border-[#334155] min-w-[160px] flex-shrink-0 transition-colors
                    ${isAct ? 'bg-blue-700 text-white' : 'text-[#94a3b8] hover:bg-[#334155] hover:text-white'}`}
                  onClick={() => { saveCurrentDraft(); setActiveId(e.taskId) }}>
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background: PLANT_COLOR[e.task.plant]||'#64748b'}}/>
                  <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">{e.task.productName}</span>
                  <span className="text-[10px] opacity-70">{e.task.taskId}</span>
                  <button className="opacity-60 hover:opacity-100 text-sm ml-1"
                    onClick={ev => { ev.stopPropagation(); handleCloseTask(e.taskId) }}>✕</button>
                </div>
              )
            })}
          </div>
          <button onClick={() => { saveCurrentDraft(); onClose() }}
            className="text-[#94a3b8] hover:text-white text-lg px-4 flex-shrink-0">✕</button>
        </div>

        {/* BMR content panel */}
        {task && (
          <div className="bg-white flex flex-col bo-content-panel" ref={panelRef}
            onChange={() => { saveCurrentDraft(); showSaved() }}>
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between px-7 py-4 text-white flex-shrink-0 bo-bmr-header">
              <div>
                <div className="text-[11px] opacity-70 mb-0.5">{task.taskId} — {task.plant} Plant</div>
                <div className="font-bold text-base">{task.productName}</div>
                <div className="text-[12px] opacity-80 mt-0.5">
                  DI: {task.diNo||'—'} | Batch: {task.batchCode||'—'} | Qty: {task.qty} {task.qtyUom||''} | Incharge: {task.incharge||'—'}
                  {task.carrier ? ` | Carrier: ${task.carrier}` : ''}{task.specs ? ` | Specs: ${task.specs}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right text-[11px] opacity-70">
                  <div>Equipment: {task.equipment||'—'}</div>
                  <div>Shift: {task.shift||'General'}</div>
                </div>
                <button onClick={() => handleSubmit(task.id)}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-[13px] font-bold transition">
                  ✓ Submit BMR
                </button>
              </div>
            </div>

            {isNanoBot ? <NanoBMR task={task} comps={comps}/> : <PowderBMR task={task} comps={comps}/>}

            {/* Save bar */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 px-7 py-3 flex items-center justify-between shadow-[0_-4px_16px_rgba(0,0,0,.06)]">
              <span className={`text-[12px] ${saveStatus.startsWith('✓') ? 'text-green-600 font-semibold' : 'text-gray-400'}`}>{saveStatus}</span>
              <div className="flex gap-2.5">
                <button onClick={() => handleCloseTask(task.id)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-[13px] font-medium hover:bg-gray-50 transition">
                  Save &amp; Close
                </button>
                <button onClick={() => handleSubmit(task.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-[13px] font-bold hover:bg-green-700 transition">
                  ✓ Submit BMR
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {qcHandoff && (
        <QCHandoffModal task={qcHandoff.task} bmrData={qcHandoff.bmrData} sfgCreated={qcHandoff.sfgCreated} onClose={handleQcClose}/>
      )}
    </>
  )
}
